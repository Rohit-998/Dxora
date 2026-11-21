import asyncio
import re
from urllib.parse import urljoin, urlsplit

import httpx
from bs4 import BeautifulSoup

from app.config import Settings
from app.errors import AnalysisError
from app.schemas import PageSource, SEOCheck
from app.services.url_policy import normalize_url, resolve_public_ip


class WebsiteExtractor:
    def __init__(self, settings: Settings, client: httpx.AsyncClient):
        self.settings = settings
        self.client = client

    async def fetch(self, url: str) -> tuple[str, str]:
        try:
            async with asyncio.timeout(self.settings.fetch_timeout_seconds):
                return await self._fetch(url)
        except (TimeoutError, httpx.TimeoutException) as exc:
            raise AnalysisError(
                "website_timeout", "The website took too long to respond.", 504
            ) from exc
        except httpx.HTTPError as exc:
            raise AnalysisError(
                "website_unavailable", "The website could not be reached securely.", 422
            ) from exc

    async def _fetch(self, url: str) -> tuple[str, str]:
        current = normalize_url(url)
        for _ in range(5):
            original = httpx.URL(current)
            address = await resolve_public_ip(original.host, original.port or 443)
            pinned = original.copy_with(host=address)
            # HTTPX/httpcore preserve hostname verification with the SNI extension.
            # The socket connects to the IP, never to a second DNS lookup.
            async with self.client.stream(
                "GET",
                pinned,
                headers={
                    "Host": original.host,
                    "Accept": "text/html,application/xhtml+xml",
                    "Accept-Encoding": "identity",
                    "User-Agent": "ApertureBot/1.0",
                },
                extensions={"sni_hostname": original.host},
                follow_redirects=False,
            ) as response:
                if response.status_code in {301, 302, 303, 307, 308}:
                    location = response.headers.get("location")
                    if not location:
                        raise AnalysisError(
                            "invalid_redirect", "The website returned an invalid redirect."
                        )
                    current = normalize_url(urljoin(current, location))
                    continue
                if response.status_code >= 400:
                    raise AnalysisError(
                        "website_restricted",
                        f"The website returned HTTP {response.status_code}. "
                        "Try another public page.",
                    )
                content_type = response.headers.get("content-type", "").split(";")[0].lower()
                if content_type not in {"text/html", "application/xhtml+xml"}:
                    raise AnalysisError(
                        "unsupported_content", "Only HTML website pages are supported."
                    )
                # Refuse compressed responses to bound decompression as well as download size.
                if response.headers.get("content-encoding", "identity").lower() != "identity":
                    raise AnalysisError(
                        "unsupported_encoding", "The website ignored the safe transfer encoding."
                    )
                chunks = bytearray()
                async for chunk in response.aiter_raw():
                    chunks.extend(chunk)
                    if len(chunks) > self.settings.max_html_bytes:
                        raise AnalysisError(
                            "page_too_large", "The page exceeds the safe download limit."
                        )
                return current, bytes(chunks).decode(response.encoding or "utf-8", errors="replace")
        raise AnalysisError("too_many_redirects", "The website redirected too many times.")

    async def extract(self, url: str) -> tuple[list[PageSource], list[str]]:
        final_url, html = await self.fetch(url)
        first, links = parse_page(final_url, html, "page-1", self.settings.max_content_chars)
        if first.word_count < 25:
            raise AnalysisError(
                "insufficient_content",
                "This page has too little readable HTML. Try a public About or Services page; "
                "JavaScript-only and login-protected pages cannot be analyzed.",
            )
        pages, warnings = [first], []
        remaining = self.settings.max_content_chars - len(first.text)
        for link in links[: self.settings.max_pages - 1]:
            if remaining < 500:
                break
            try:
                child_url, child_html = await self.fetch(link)
                if urlsplit(child_url).hostname != urlsplit(final_url).hostname:
                    warnings.append("An internal link redirected off-site and was excluded.")
                    continue
                if child_url in {page.url for page in pages}:
                    continue
                child, _ = parse_page(child_url, child_html, f"page-{len(pages) + 1}", remaining)
                if child.word_count >= 25 and child.text != first.text:
                    pages.append(child)
                    remaining -= len(child.text)
            except AnalysisError:
                warnings.append(
                    "An additional internal page could not be read; analysis uses available pages."
                )
        return pages, list(dict.fromkeys(warnings))


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def parse_page(url: str, html: str, source_id: str, limit: int) -> tuple[PageSource, list[str]]:
    soup = BeautifulSoup(html, "html.parser")
    title = clean_text(soup.title.get_text())[:500] if soup.title else ""
    meta = soup.find("meta", attrs={"name": re.compile("^description$", re.I)})
    description = clean_text(str(meta.get("content", "")))[:1000] if meta else ""
    canonical = soup.find("link", rel="canonical")
    canonical_url = (
        urljoin(url, str(canonical.get("href"))) if canonical and canonical.get("href") else None
    )
    headings = [clean_text(node.get_text(" "))[:300] for node in soup.find_all(["h1", "h2", "h3"])][
        :35
    ]
    images = soup.find_all("img")
    missing_alt = sum(not str(node.get("alt", "")).strip() for node in images)
    links = []
    for node in soup.find_all("a", href=True):
        candidate = urljoin(url, str(node["href"]))
        parsed = urlsplit(candidate)
        if parsed.hostname == urlsplit(url).hostname and parsed.path != urlsplit(url).path:
            if any(
                word in parsed.path.lower() for word in ("about", "service", "product", "solution")
            ):
                try:
                    normalized = normalize_url(candidate)
                    if normalized not in links:
                        links.append(normalized)
                except AnalysisError:
                    pass
    for node in soup(["script", "style", "noscript", "svg", "nav", "footer", "header", "form"]):
        node.decompose()
    lines = dict.fromkeys(clean_text(line) for line in soup.get_text("\n").splitlines())
    text = "\n".join(line for line in lines if line)[:limit]
    return PageSource(
        id=source_id,
        url=url,
        title=title,
        meta_description=description,
        headings=headings,
        text=text,
        word_count=len(text.split()),
        canonical=canonical_url,
        image_count=len(images),
        images_without_alt=missing_alt,
    ), links


def seo_checks(page: PageSource) -> list[SEOCheck]:
    return [
        SEOCheck(
            name="Page title",
            status="pass" if 30 <= len(page.title) <= 65 else "review",
            detail=f"{len(page.title)} characters. Review for a descriptive, concise title.",
        ),
        SEOCheck(
            name="Meta description",
            status="pass" if 120 <= len(page.meta_description) <= 165 else "review",
            detail=f"{len(page.meta_description)} characters. Write a useful search snippet.",
        ),
        SEOCheck(
            name="Heading structure",
            status="pass" if page.headings else "review",
            detail=f"{len(page.headings)} H1–H3 headings found in the page HTML.",
        ),
        SEOCheck(
            name="Image descriptions",
            status="pass" if not page.images_without_alt else "review",
            detail=f"{page.images_without_alt} of {page.image_count} images lack non-empty alt text. "
            "Decorative images may intentionally have empty alt text.",
        ),
        SEOCheck(
            name="Canonical URL",
            status="pass" if page.canonical else "review",
            detail="A canonical link is present." if page.canonical else "No canonical link found.",
        ),
        SEOCheck(
            name="HTTPS",
            status="pass" if page.url.startswith("https:") else "review",
            detail="HTTPS is enabled."
            if page.url.startswith("https:")
            else "Use HTTPS for this page.",
        ),
    ]
