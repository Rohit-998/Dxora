from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: SecretStr = SecretStr("")
    gemini_model: str = Field(default="gemini-2.5-flash", pattern=r"^[a-zA-Z0-9.\-]+$")
    analysis_api_key: SecretStr = SecretStr("")
    allowed_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    cache_ttl_seconds: int = Field(default=900, ge=1, le=86400)
    cache_max_entries: int = Field(default=128, ge=1, le=10000)
    rate_limit_per_minute: int = Field(default=10, ge=1, le=1000)
    max_concurrent_analyses: int = Field(default=3, ge=1, le=20)
    fetch_timeout_seconds: float = Field(default=15, ge=1, le=60)
    llm_timeout_seconds: float = Field(default=75, ge=1, le=180)
    max_pages: int = Field(default=3, ge=1, le=5)
    max_html_bytes: int = Field(default=2_000_000, ge=1024, le=5_000_000)
    max_content_chars: int = Field(default=24000, ge=1000, le=60000)
    static_directory: str = "frontend/dist"
