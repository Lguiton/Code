"""Centralized application configuration.

All secrets and environment-specific values are read from environment
variables (and optionally a ``backend/.env`` file). Required secrets have
NO defaults: the app fails fast at startup with a clear error instead of
running with an insecure fallback.
"""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENVIRONMENT: str = "dev"  # "dev" | "prod"

    # --- Required secrets: no defaults, fail fast if missing ---
    DATABASE_URL: str
    JWT_SECRET: str

    # --- AI vision ---
    GEMINI_API_KEY: str | None = None
    # Dev-only fake vision responses. Refused in production (see validator).
    MOCK_AI: bool = False

    # --- CORS: comma-separated list of allowed frontend origins ---
    CORS_ORIGINS: str = "http://127.0.0.1:3004"

    # --- Uploads ---
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_MB: int = 10

    # --- Rate limiting (applied to the ingestion upload endpoint) ---
    RATE_LIMIT_REQUESTS: int = 30
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # --- Database bootstrap ---
    # In production set this to false and use migrations (Alembic).
    AUTO_CREATE_TABLES: bool = True

    # --- JWT ---
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 12

    # --- Hosts ---
    ALLOWED_HOSTS: str = "*"  # comma-separated; set explicitly in prod

    @field_validator("JWT_SECRET")
    @classmethod
    def _secret_must_be_strong(cls, v: str) -> str:
        banned = {"super-secret-key-change-in-production", "changeme", "secret", ""}
        if v.strip().lower() in banned or len(v.strip()) < 32:
            raise ValueError(
                "JWT_SECRET must be set to a strong random value (>= 32 characters). "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return v

    @field_validator("MOCK_AI")
    @classmethod
    def _mock_ai_dev_only(cls, v: bool, info) -> bool:
        if v and info.data.get("ENVIRONMENT") == "prod":
            raise ValueError("MOCK_AI must never be enabled in production.")
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def allowed_hosts_list(self) -> list[str]:
        return [h.strip() for h in self.ALLOWED_HOSTS.split(",") if h.strip()]

    @property
    def is_prod(self) -> bool:
        return self.ENVIRONMENT == "prod"


@lru_cache
def get_settings() -> Settings:
    return Settings()
