"""Application settings loaded from environment variables and the .env file."""

import re
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> parents[2] is the backend folder.
_BACKEND_DIR = Path(__file__).resolve().parents[2]
_SQLITE_PREFIX = "sqlite:///"
_WINDOWS_DRIVE = re.compile(r"^[A-Za-z]:[\\/]")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Default: local SQLite file inside the project (no PostgreSQL install needed).
    # To use PostgreSQL instead, set DATABASE_URL in .env, e.g.
    # postgresql+psycopg://user:pass@localhost:5432/rescuerelay
    DATABASE_URL: str = _SQLITE_PREFIX + str(_BACKEND_DIR / "data" / "rescuerelay.db")
    JWT_SECRET: str = "dev-only-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"
    DEMO_MODE: bool = True
    DISPATCH_OFFER_TIMEOUT_SECONDS: int = 120
    MATCHING_SAFETY_BUFFER_MINUTES: int = 10
    AI_ENABLED: bool = False
    AI_API_KEY: str = ""
    AI_MODEL: str = ""

    @field_validator("DATABASE_URL")
    @classmethod
    def _resolve_sqlite_path(cls, value: str) -> str:
        if not value.startswith(_SQLITE_PREFIX):
            return value
        rest = value[len(_SQLITE_PREFIX):]
        if rest == ":memory:" or not rest:
            return value
        if Path(rest).is_absolute() or _WINDOWS_DRIVE.match(rest):
            return value
        return _SQLITE_PREFIX + str(_BACKEND_DIR / rest)

    @model_validator(mode="after")
    def _require_strong_jwt_secret_outside_demo(self) -> "Settings":
        if self.DEMO_MODE:
            return self
        weak_secrets = {"dev-only-change-me", "change-me-to-a-long-random-string"}
        if self.JWT_SECRET in weak_secrets or len(self.JWT_SECRET) < 32:
            raise ValueError(
                "JWT_SECRET must be set to a unique value of at least 32 characters "
                "when DEMO_MODE is false"
            )
        return self


    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
