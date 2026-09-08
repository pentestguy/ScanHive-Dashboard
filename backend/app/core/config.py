import secrets
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    FRONTEND_URL: str = "http://localhost:5173"

    # Comma-separated list of extra origins allowed to call the API (e.g. a
    # public domain or IP the dashboard is served from). localhost, 127.0.0.1
    # and private LAN ranges are already allowed and don't need to be listed.
    EXTRA_CORS_ORIGINS: str = ""

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "ScanHive"
    SMTP_USE_TLS: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )


def _load_or_generate_secret_key() -> str:
    """Persist a random JWT signing key across restarts so no manual setup is required."""
    key_path = Path("/data/secret_key")
    key_path.parent.mkdir(parents=True, exist_ok=True)
    if key_path.exists():
        return key_path.read_text().strip()
    generated = secrets.token_hex(32)
    key_path.write_text(generated)
    return generated


settings = Settings()
if not settings.SECRET_KEY:
    settings.SECRET_KEY = _load_or_generate_secret_key()
