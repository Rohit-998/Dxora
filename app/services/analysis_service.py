import asyncio
import time
from datetime import UTC, datetime

from cachetools import TTLCache

from app.config import Settings
from app.errors import AnalysisError
from app.schemas import AnalysisResponse, ReportMetadata
from app.services.llm_service import GeminiService
from app.services.url_policy import normalize_url
from app.services.website_extractor import WebsiteExtractor, seo_checks


class AnalysisService:
    def __init__(self, settings: Settings, extractor: WebsiteExtractor, llm: GeminiService):
        self.settings = settings
        self.extractor = extractor
        self.llm = llm
        self.cache: TTLCache = TTLCache(settings.cache_max_entries, settings.cache_ttl_seconds)
        self.slots = asyncio.Semaphore(settings.max_concurrent_analyses)
        # Fixed-size lock striping avoids an unbounded per-URL lock registry.
        self.locks = [asyncio.Lock() for _ in range(32)]

    def cached(self, url: str, request_id: str) -> AnalysisResponse | None:
        report = self.cache.get(url)
        if report is None:
            return None
        copy = report.model_copy(deep=True)
        copy.metadata.cached = True
        copy.metadata.request_id = request_id
        copy.metadata.duration_ms = 0
        return copy

    async def analyze(self, url: str, request_id: str) -> AnalysisResponse:
        normalized = normalize_url(url)
        if cached := self.cached(normalized, request_id):
            return cached
        if not self.settings.gemini_api_key.get_secret_value():
            raise AnalysisError(
                "not_configured", "Add GEMINI_API_KEY to the server .env to run live analysis.", 503
            )
        # Admission is bounded, including duplicate requests; no unlimited waiting queue.
        try:
            await asyncio.wait_for(self.slots.acquire(), timeout=0.25)
        except TimeoutError as exc:
            raise AnalysisError(
                "server_busy", "All analysis slots are busy. Please try again shortly.", 503
            ) from exc
        try:
            async with self.locks[hash(normalized) % len(self.locks)]:
                if cached := self.cached(normalized, request_id):
                    return cached
                start = time.perf_counter()
                pages, warnings = await self.extractor.extract(normalized)
                generated, usage = await self.llm.generate(pages)
                result = AnalysisResponse(
                    **generated.model_dump(exclude={"limitations"}),
                    limitations=list(dict.fromkeys(generated.limitations + warnings)),
                    website=pages[0].url,
                    sources=pages,
                    seo_checks=seo_checks(pages[0]),
                    metadata=ReportMetadata(
                        request_id=request_id,
                        generated_at=datetime.now(UTC),
                        duration_ms=int((time.perf_counter() - start) * 1000),
                        model=self.settings.gemini_model,
                        source_count=len(pages),
                        input_tokens=usage.get("promptTokenCount"),
                        output_tokens=usage.get("candidatesTokenCount"),
                        thinking_tokens=usage.get("thoughtsTokenCount"),
                    ),
                )
                self.cache[normalized] = result.model_copy(deep=True)
                return result
        finally:
            self.slots.release()
