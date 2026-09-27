"""Application settings loaded from environment variables.

Centralized configuration via pydantic-settings. The same Settings singleton
is used everywhere (FastAPI dependencies, CLI scripts, Alembic env).
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Strongly-typed application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- General ---
    environment: Literal["development", "staging", "production", "test"] = "development"
    log_level: str = "INFO"
    api_cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    # --- Database ---
    database_url: str = "postgresql+psycopg://harmonyhub:harmonyhub_dev_pw@localhost:5432/harmonyhub"
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_echo: bool = False

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"

    # --- Security / JWT ---
    jwt_secret: SecretStr = SecretStr("change-me")
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24 * 30  # 30 days

    # --- Firebase Admin ---
    firebase_credentials_path: str | None = None
    firebase_project_id: str | None = None

    # --- File uploads ---
    upload_dir: Path = Path("./uploads")
    analysis_dir: Path = Path("./analysis")
    max_upload_mb: int = 64

    @field_validator("api_cors_origins", mode="before")
    @classmethod
    def _split_csv(cls, value):  # noqa: D401
        if isinstance(value, str):
            return [v.strip() for v in value.split(",") if v.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_test(self) -> bool:
        return self.environment == "test"

    def ensure_dirs(self) -> None:
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.analysis_dir.mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings accessor."""
    s = Settings()
    if not s.is_test:
        s.ensure_dirs()
    return s
