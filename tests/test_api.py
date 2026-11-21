from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.main import create_app


def test_contract_and_docs(settings, report):
    service = AsyncMock()
    service.analyze.return_value = report
    with TestClient(create_app(settings, service)) as client:
        response = client.post("/link-analysis", json={"url": "https://example.com"})
        assert response.status_code == 200
        body = response.json()
        assert len(body["analysis"]["target_search_queries"]) == 5
        assert set(body["analysis"]) == {
            "competitor_analysis",
            "target_search_queries",
            "seo_improvements",
            "top_services",
            "target_audience",
        }
        assert response.headers["x-request-id"]
        assert client.get("/docs").status_code == 200
        assert client.get("/health").json()["configured"]


def test_invalid_request_and_body_limit(settings):
    with TestClient(create_app(settings, AsyncMock())) as client:
        for body in [{}, {"url": "short"}, {"url": "https://example.com", "extra": 1}]:
            assert client.post("/link-analysis", json=body).status_code == 422
        assert client.post("/link-analysis", content="x" * 4097).status_code == 413


def test_auth_and_rate_limit(settings, report):
    settings.analysis_api_key = "private-api-key"
    # Settings normally coerces SecretStr on initial construction.
    from pydantic import SecretStr

    settings.analysis_api_key = SecretStr("private-api-key")
    settings.rate_limit_per_minute = 1
    service = AsyncMock()
    service.analyze.return_value = report
    with TestClient(create_app(settings, service)) as client:
        assert client.post("/link-analysis", json={"url": "https://example.com"}).status_code == 401
        headers = {"x-api-key": "private-api-key"}
        assert (
            client.post(
                "/link-analysis", headers=headers, json={"url": "https://example.com"}
            ).status_code
            == 200
        )
        limited = client.post(
            "/link-analysis", headers=headers, json={"url": "https://example.com"}
        )
        assert limited.status_code == 429
        assert limited.headers["retry-after"] == "60"


def test_missing_key_is_actionable(settings):
    from pydantic import SecretStr

    settings.gemini_api_key = SecretStr("")
    with TestClient(create_app(settings)) as client:
        response = client.post("/link-analysis", json={"url": "https://example.com"})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "not_configured"
