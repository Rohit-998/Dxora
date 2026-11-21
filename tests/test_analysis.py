import json
from unittest.mock import AsyncMock

import httpx
import pytest

from app.errors import AnalysisError
from app.schemas import GeneratedReport
from app.services.analysis_service import AnalysisService
from app.services.llm_service import GeminiService, verify_evidence


def generated(report):
    return GeneratedReport.model_validate(
        report.model_dump(include={"brand", "analysis", "limitations"})
    )


async def test_structured_gemini_request(settings, report):
    async def handler(request):
        payload = json.loads(request.content)
        assert request.headers["x-goog-api-key"] == "test-key"
        assert "test-key" not in str(request.url)
        assert payload["generationConfig"]["responseMimeType"] == "application/json"
        assert "properties" in payload["generationConfig"]["responseJsonSchema"]
        assert "UNTRUSTED" in payload["systemInstruction"]["parts"][0]["text"]
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "finishReason": "STOP",
                        "content": {"parts": [{"text": generated(report).model_dump_json()}]},
                    }
                ],
                "usageMetadata": {"promptTokenCount": 1200},
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result, usage = await GeminiService(settings, client).generate(report.sources)
    assert result.brand.name == "Forma"
    assert usage["promptTokenCount"] == 1200


@pytest.mark.parametrize(
    ("status", "body", "code"),
    [
        (403, {"private": "secret upstream details"}, "provider_auth"),
        (400, {}, "provider_error"),
        (200, {"candidates": []}, "incomplete_analysis"),
        (200, {"candidates": [{"finishReason": "MAX_TOKENS"}]}, "incomplete_analysis"),
        (
            200,
            {"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": "{}"}]}}]},
            "invalid_analysis",
        ),
    ],
)
async def test_provider_failures_are_sanitized(settings, report, status, body, code):
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(lambda _: httpx.Response(status, json=body))
    ) as client:
        with pytest.raises(AnalysisError) as error:
            await GeminiService(settings, client).generate(report.sources)
    assert error.value.code == code
    assert "secret" not in str(error.value)


def test_fabricated_evidence_is_downgraded(report):
    result = generated(report)
    result.analysis.top_services[0].evidence[
        0
    ].quote = "Invented customer claim not present anywhere"
    verify_evidence(result, report.sources)
    assert result.analysis.top_services[0].evidence_status == "inferred"
    assert result.analysis.top_services[0].evidence == []
    assert result.analysis.top_services[1].evidence_status == "observed"


async def test_cache_avoids_repeated_fetch_and_generation(settings, report):
    extractor = AsyncMock()
    extractor.extract.return_value = (report.sources, [])
    llm = AsyncMock()
    llm.generate.return_value = (generated(report), {})
    service = AnalysisService(settings, extractor, llm)
    first = await service.analyze("https://example.com", "first")
    second = await service.analyze("https://example.com/#fragment", "second")
    assert not first.metadata.cached
    assert second.metadata.cached
    assert second.metadata.request_id == "second"
    second.brand.name = "mutated"
    assert service.cached("https://example.com/", "third").brand.name == "Forma"
    extractor.extract.assert_awaited_once()
    llm.generate.assert_awaited_once()


async def test_simultaneous_duplicates_share_result(settings, report):
    import asyncio

    extractor = AsyncMock()
    extractor.extract.return_value = (report.sources, [])

    async def delayed_generate(_):
        await asyncio.sleep(0.02)
        return generated(report), {}

    llm = AsyncMock()
    llm.generate.side_effect = delayed_generate
    service = AnalysisService(settings, extractor, llm)
    results = await asyncio.gather(
        service.analyze("https://example.com", "one"),
        service.analyze("https://example.com", "two"),
    )
    assert sum(result.metadata.cached for result in results) == 1
    llm.generate.assert_awaited_once()


async def test_busy_server_fails_without_queueing_unbounded_work(settings, report):
    service = AnalysisService(settings, AsyncMock(), AsyncMock())
    for _ in range(settings.max_concurrent_analyses):
        await service.slots.acquire()
    with pytest.raises(AnalysisError) as error:
        await service.analyze("https://example.com", "busy")
    assert error.value.code == "server_busy"
    service.extractor.extract.assert_not_awaited()


async def test_transient_provider_error_retries_once(settings, report, monkeypatch):
    sleep = AsyncMock()
    monkeypatch.setattr("app.services.llm_service.asyncio.sleep", sleep)
    responses = [
        httpx.Response(503),
        httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "finishReason": "STOP",
                        "content": {"parts": [{"text": generated(report).model_dump_json()}]},
                    }
                ]
            },
        ),
    ]
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(lambda _: responses.pop(0))
    ) as client:
        result, _ = await GeminiService(settings, client).generate(report.sources)
    assert result.brand.name == "Forma"
    sleep.assert_awaited_once()
    assert not responses


def test_query_contract_rejects_missing_platform_and_duplicates(report):
    from pydantic import ValidationError

    data = generated(report).model_dump()
    data["analysis"]["target_search_queries"][4]["platforms"] = ["Google"]
    with pytest.raises(ValidationError, match="five supported platforms"):
        GeneratedReport.model_validate(data)
    data = generated(report).model_dump()
    data["analysis"]["target_search_queries"][4]["query"] = data["analysis"][
        "target_search_queries"
    ][0]["query"]
    with pytest.raises(ValidationError, match="distinct"):
        GeneratedReport.model_validate(data)
