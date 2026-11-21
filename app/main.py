import logging
import secrets
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from cachetools import TTLCache
from fastapi import FastAPI, Request, Security
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from fastapi.staticfiles import StaticFiles

from app.config import Settings
from app.errors import AnalysisError
from app.schemas import AnalysisRequest, AnalysisResponse, ErrorResponse
from app.services.analysis_service import AnalysisService
from app.services.llm_service import GeminiService
from app.services.website_extractor import WebsiteExtractor

logger = logging.getLogger("uvicorn.error")


def create_app(settings: Settings | None = None, service=None) -> FastAPI:
    config = settings or Settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        async with (
            httpx.AsyncClient(
                trust_env=False,
                timeout=config.fetch_timeout_seconds,
                limits=httpx.Limits(max_connections=15, max_keepalive_connections=0),
            ) as website_client,
            httpx.AsyncClient(trust_env=False) as llm_client,
        ):
            application.state.analysis_service = service or AnalysisService(
                config, WebsiteExtractor(config, website_client), GeminiService(config, llm_client)
            )
            yield

    application = FastAPI(
        title="Aperture · Website Intelligence",
        version="1.0.0",
        description="Evidence-aware website analysis powered by Gemini. "
        "Competitor suggestions and inferred recommendations are explicitly labeled.",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.allowed_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-API-Key"],
        expose_headers=["X-Request-ID"],
    )
    buckets: TTLCache = TTLCache(maxsize=10000, ttl=60)

    def error_response(request: Request, code: str, message: str, status: int):
        headers = {"Retry-After": "60"} if status == 429 else {}
        return JSONResponse(
            status_code=status,
            headers=headers,
            content={
                "success": False,
                "error": {"code": code, "message": message, "request_id": request.state.request_id},
            },
        )

    @application.middleware("http")
    async def request_context(request: Request, call_next):
        request.state.request_id = str(uuid.uuid4())
        started = time.perf_counter()
        if request.url.path == "/link-analysis" and request.method == "POST":
            expected = config.analysis_api_key.get_secret_value()
            supplied = request.headers.get("x-api-key", "")
            if expected and not secrets.compare_digest(expected.encode(), supplied.encode()):
                return error_response(
                    request, "unauthorized", "A valid analysis API key is required.", 401
                )
            # Only trust the ASGI peer; never parse arbitrary X-Forwarded-For here.
            peer = request.client.host if request.client else "unknown"
            count = buckets.get(peer, 0)
            if count >= config.rate_limit_per_minute:
                return error_response(
                    request, "rate_limited", "Too many analyses. Please wait a minute.", 429
                )
            buckets[peer] = count + 1
            size = 0
            body = bytearray()
            async for chunk in request.stream():
                size += len(chunk)
                if size > 4096:
                    return error_response(
                        request, "request_too_large", "Request body exceeds 4 KB.", 413
                    )
                # Starlette caches body only through .body(); replay a bounded body below.
                body.extend(chunk)
            request._body = bytes(body) if size else b""
        try:
            response = await call_next(request)
        except Exception:
            # Do not log the URL, provider response, request body, key, or exception text.
            logger.error("unhandled_error request_id=%s", request.state.request_id)
            response = error_response(
                request, "internal_error", "An unexpected error occurred.", 500
            )
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Cache-Control"] = "no-store"
        logger.info(
            "request id=%s method=%s status=%s duration_ms=%d",
            request.state.request_id,
            request.method,
            response.status_code,
            int((time.perf_counter() - started) * 1000),
        )
        return response

    @application.exception_handler(AnalysisError)
    async def analysis_error_handler(request: Request, exc: AnalysisError):
        return error_response(request, exc.code, exc.message, exc.status_code)

    @application.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        return error_response(
            request,
            "invalid_request",
            "Send JSON with one 'url' string containing a public website URL.",
            422,
        )

    @application.get("/health", tags=["Operations"])
    async def health():
        return {
            "status": "ok",
            "version": "1.0.0",
            "configured": bool(config.gemini_api_key.get_secret_value()),
            "authentication_required": bool(config.analysis_api_key.get_secret_value()),
            "model": config.gemini_model,
        }

    @application.post(
        "/link-analysis",
        response_model=AnalysisResponse,
        tags=["Analysis"],
        dependencies=[
            Security(
                APIKeyHeader(
                    name="X-API-Key",
                    auto_error=False,
                    description="App access key; needed when ANALYSIS_API_KEY is configured. "
                    "Never enter your Gemini provider key here.",
                )
            )
        ],
        responses={code: {"model": ErrorResponse} for code in (401, 413, 422, 429, 502, 503, 504)},
    )
    async def link_analysis(payload: AnalysisRequest, request: Request):
        return await request.app.state.analysis_service.analyze(
            payload.url, request.state.request_id
        )

    static = Path(config.static_directory)
    if static.is_dir():
        application.mount("/", StaticFiles(directory=static, html=True), name="frontend")
    return application


app = create_app()
