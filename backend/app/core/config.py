"""Application settings loaded from environment variables and the .env file."""

import re
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

# backend/app/core/config.py -> parents[2] is the backend folder.
_BACKEND_DIR = Path(__file__).resolve().parents[2]
_SQLITE_PREFIX = "sqlite:///"
_WINDOWS_DRIVE = re.compile(r"^[A-Za-z]:[\\/]")


def _parse_database_url(value: str):
    try:
        return make_url(value)
    except ArgumentError:
        raise ValueError("Database connection must be a valid database URL, without a psql command") from None


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_BACKEND_DIR / ".env", extra="ignore", hide_input_in_errors=True)

    # Default: local SQLite file inside the project (no PostgreSQL install needed).
    # To use PostgreSQL instead, set DATABASE_URL in .env, e.g.
    # postgresql+psycopg://user:pass@localhost:5432/rescuerelay
    DATABASE_URL: str = _SQLITE_PREFIX + str(_BACKEND_DIR / "data" / "rescuerelay.db")
    DATABASE_TARGET: Literal["local", "neon"] = "local"
    NEON_DATABASE_URL: str = ""
    NEON_DIRECT_DATABASE_URL: str = ""
    JWT_SECRET: str = "dev-only-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"
    DEMO_MODE: bool = True
    DEMO_CLOCK_ENABLED: bool = False
    DISPATCH_OFFER_TIMEOUT_SECONDS: int = 120
    MATCHING_SAFETY_BUFFER_MINUTES: int = 10
    AI_ENABLED: bool = False
    AI_API_KEY: str = ""
    AI_MODEL: str = ""

    @field_validator("DATABASE_URL", "NEON_DATABASE_URL", "NEON_DIRECT_DATABASE_URL")
    @classmethod
    def _resolve_sqlite_path(cls, value: str) -> str:
        value = value.strip()
        if value.startswith("postgres://"):
            value = "postgresql://" + value[len("postgres://"):]
        if value.startswith("postgresql://"):
            value = "postgresql+psycopg://" + value[len("postgresql://"):]
        if value.startswith("postgresql+"):
            url = _parse_database_url(value)
            if (url.host or "").endswith(".neon.tech") and "sslmode" not in url.query:
                value = url.update_query_dict({"sslmode": "require"}).render_as_string(hide_password=False)
        if not value.startswith(_SQLITE_PREFIX):
            return value
        rest = value[len(_SQLITE_PREFIX):]
        if rest == ":memory:" or not rest:
            return value
        if Path(rest).is_absolute() or _WINDOWS_DRIVE.match(rest):
            return value
        return _SQLITE_PREFIX + str(_BACKEND_DIR / rest)

    @model_validator(mode="after")
    def _validate_neon_target(self) -> "Settings":
        if self.DATABASE_TARGET == "neon":
            if not self.NEON_DATABASE_URL:
                raise ValueError("Set NEON_DATABASE_URL in backend/.env when DATABASE_TARGET=neon")
            for value in (self.NEON_DATABASE_URL, self.NEON_DIRECT_DATABASE_URL):
                if value and _parse_database_url(value).drivername != "postgresql+psycopg":
                    raise ValueError("Neon connections must use a postgresql:// or postgresql+psycopg:// URL")
        return self

    @property
    def active_database_url(self) -> str:
        return self.NEON_DATABASE_URL if self.DATABASE_TARGET == "neon" else self.DATABASE_URL

    @property
    def migration_database_url(self) -> str:
        if self.DATABASE_TARGET == "neon" and self.NEON_DIRECT_DATABASE_URL:
            return self.NEON_DIRECT_DATABASE_URL
        return self.active_database_url

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
