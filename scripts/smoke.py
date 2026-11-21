"""Inspect a real public page without a Gemini call, or validate a live API response."""

import argparse
import asyncio
import json

import httpx

from app.config import Settings
from app.schemas import AnalysisResponse
from app.services.website_extractor import WebsiteExtractor


async def run(url: str, api_base: str | None) -> None:
    settings = Settings()
    async with httpx.AsyncClient(trust_env=False, timeout=160) as client:
        if api_base:
            response = await client.post(
                f"{api_base.rstrip('/')}/link-analysis",
                json={"url": url},
                headers={"X-API-Key": settings.analysis_api_key.get_secret_value()},
            )
            if response.is_error:
                print(json.dumps(response.json(), indent=2))
                raise SystemExit(1)
            report = AnalysisResponse.model_validate(response.json())
            assert not report.metadata.is_demo
            print(report.model_dump_json(indent=2))
        else:
            pages, warnings = await WebsiteExtractor(settings, client).extract(url)
            print(
                json.dumps(
                    {
                        "mode": "live_extraction_only",
                        "llm_called": False,
                        "pages": [
                            {"url": p.url, "title": p.title, "words": p.word_count} for p in pages
                        ],
                        "warnings": warnings,
                    },
                    indent=2,
                )
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("--api-base", help="Call a running API (uses its Gemini quota).")
    arguments = parser.parse_args()
    asyncio.run(run(arguments.url, arguments.api_base))
