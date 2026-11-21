import json
from pathlib import Path

import pytest

from app.config import Settings
from app.schemas import AnalysisResponse


@pytest.fixture
def settings():
    return Settings(_env_file=None, gemini_api_key="test-key", max_pages=1)


@pytest.fixture
def report():
    path = Path(__file__).resolve().parents[1] / "examples/sample-response.json"
    return AnalysisResponse.model_validate(json.loads(path.read_text(encoding="utf-8")))
