import socket
from unittest.mock import AsyncMock

import httpx
import pytest

from app.errors import AnalysisError
from app.services.url_policy import is_public_ip, normalize_url, resolve_public_ip
from app.services.website_extractor import WebsiteExtractor, parse_page


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "ftp://example.com",
        "https://user:password@example.com",
        "https://example.com:8080",
        "http://localhost",
        "http://metadata.internal",
        "http://x.local",
        "https://example.com\\@127.0.0.1",
        "https://example.com\n",
        "http://[fe80::1%25eth0]",
        "not a url",
    ],
)
def test_invalid_urls(url):
    with pytest.raises(AnalysisError):
        normalize_url(url)


@pytest.mark.parametrize(
    "address",
    [
        "127.0.0.1",
        "10.0.0.1",
        "172.16.0.1",
        "192.168.1.1",
        "169.254.169.254",
        "0.0.0.0",
        "100.64.0.1",
        "224.0.0.1",
        "::1",
        "fc00::1",
        "fe80::1",
        "::ffff:8.8.8.8",
        "64:ff9b::7f00:1",
        "2002:7f00:0001::",
    ],
)
def test_nonpublic_and_transition_addresses(address):
    assert not is_public_ip(address)


def test_url_normalization_and_public_addresses():
    assert normalize_url("https://EXAMPLE.COM:443/a?q=1#section") == "https://example.com/a?q=1"
    assert is_public_ip("8.8.8.8")
    assert is_public_ip("2606:4700:4700::1111")


async def test_mixed_dns_answer_rejected(monkeypatch):
    import asyncio

    lookup = AsyncMock(
        return_value=[
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("8.8.8.8", 443)),
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 443)),
        ]
    )
    monkeypatch.setattr(asyncio.get_running_loop(), "getaddrinfo", lookup)
    with pytest.raises(AnalysisError, match="non-public"):
        await resolve_public_ip("example.com", 443)


class ByteStream(httpx.AsyncByteStream):
    def __init__(self, content):
        self.content = content

    async def __aiter__(self):
        yield self.content


async def test_fetch_pins_ip_and_preserves_tls_host(settings, monkeypatch):
    resolver = AsyncMock(return_value="93.184.216.34")
    monkeypatch.setattr("app.services.website_extractor.resolve_public_ip", resolver)

    async def handler(request):
        assert request.url.host == "93.184.216.34"
        assert request.headers["host"] == "example.com"
        assert request.extensions["sni_hostname"] == "example.com"
        return httpx.Response(
            200, headers={"content-type": "text/html"}, stream=ByteStream(b"<h1>Hello</h1>")
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        url, html = await WebsiteExtractor(settings, client).fetch("https://example.com")
    assert url == "https://example.com/"
    assert "Hello" in html
    resolver.assert_awaited_once()


async def test_redirect_to_private_address_is_blocked(settings, monkeypatch):
    resolver = AsyncMock(
        side_effect=["93.184.216.34", AnalysisError("blocked", "private destination")]
    )
    monkeypatch.setattr("app.services.website_extractor.resolve_public_ip", resolver)
    handler = AsyncMock(
        return_value=httpx.Response(302, headers={"location": "http://127.0.0.1/secret"})
    )
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(AnalysisError, match="private"):
            await WebsiteExtractor(settings, client).fetch("https://example.com")
    assert handler.await_count == 1


@pytest.mark.parametrize(
    ("status", "headers", "content", "code"),
    [
        (403, {"content-type": "text/html"}, b"", "website_restricted"),
        (200, {"content-type": "application/pdf"}, b"pdf", "unsupported_content"),
        (200, {"content-type": "text/html"}, b"x" * 2048, "page_too_large"),
        (
            200,
            {"content-type": "text/html", "content-encoding": "gzip"},
            b"",
            "unsupported_encoding",
        ),
    ],
)
async def test_fetch_limits(settings, monkeypatch, status, headers, content, code):
    settings.max_html_bytes = 1024
    monkeypatch.setattr(
        "app.services.website_extractor.resolve_public_ip", AsyncMock(return_value="8.8.8.8")
    )
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(
            lambda _: httpx.Response(status, headers=headers, stream=ByteStream(content))
        )
    ) as client:
        with pytest.raises(AnalysisError) as error:
            await WebsiteExtractor(settings, client).fetch("https://example.com")
    assert error.value.code == code


def test_extract_removes_noise_and_preserves_evidence():
    html = '<title> Studio </title><nav>IGNORE NAV</nav><script>ignore()</script><main><h1>Design studio</h1><p>We build accessible websites.</p><p>We build accessible websites.</p><a href="/services">Services</a><img src="x"><img alt="Logo"></main>'
    page, links = parse_page("https://example.com/", html, "page-1", 1000)
    assert "IGNORE" not in page.text and "ignore()" not in page.text
    assert page.text.count("We build accessible websites.") == 1
    assert page.images_without_alt == 1
    assert links == ["https://example.com/services"]


async def test_empty_content_has_actionable_error(settings):
    extractor = WebsiteExtractor(settings, None)
    extractor.fetch = AsyncMock(return_value=("https://example.com/", "<div id='app'></div>"))
    with pytest.raises(AnalysisError, match="JavaScript"):
        await extractor.extract("https://example.com/")


async def test_multi_page_extraction_and_partial_failure(settings):
    settings.max_pages = 3
    content = "A useful public website describing software development and design services. " * 5
    extractor = WebsiteExtractor(settings, None)
    extractor.fetch = AsyncMock(
        side_effect=[
            (
                "https://example.com/",
                f"<main>{content}<a href='/about'>About</a><a href='/services'>Services</a></main>",
            ),
            ("https://example.com/about", f"<main>About the company: {content}</main>"),
            AnalysisError("website_restricted", "Forbidden"),
        ]
    )
    pages, warnings = await extractor.extract("https://example.com/")
    assert len(pages) == 2
    assert [p.id for p in pages] == ["page-1", "page-2"]
    assert warnings and "could not be read" in warnings[0]
    assert sum(len(page.text) for page in pages) <= settings.max_content_chars


async def test_offsite_internal_redirect_is_excluded(settings):
    settings.max_pages = 2
    content = "A useful public website describing software development and design services. " * 5
    extractor = WebsiteExtractor(settings, None)
    extractor.fetch = AsyncMock(
        side_effect=[
            ("https://example.com/", f"<main>{content}<a href='/about'>About</a></main>"),
            ("https://unrelated.example.org/", f"<main>{content}</main>"),
        ]
    )
    pages, warnings = await extractor.extract("https://example.com/")
    assert len(pages) == 1
    assert "off-site" in warnings[0]
