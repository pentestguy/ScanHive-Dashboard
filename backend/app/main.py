from fastapi import FastAPI
from sqlalchemy import text as sql_text

from app.db.base import Base
from app.db.session import engine

from app.models import *
from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as project_router
from app.api.v1.scans import router as scan_router
from app.api.v1.findings import router as finding_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.iam import router as iam_router
from app.api.v1.api_keys import router as api_key_router
from app.core.config import settings
from fastapi.middleware.cors import CORSMiddleware



Base.metadata.create_all(bind=engine)

# create_all only creates missing tables, it never alters existing ones --
# there's no migration framework in this project, so newly added nullable
# columns are added by hand here, guarded to be safe to run on every startup.
with engine.begin() as connection:
    for column, ddl_type in [
        ("end_line", "INTEGER"),
        ("start_column", "INTEGER"),
        ("end_column", "INTEGER"),
        ("snippet", "TEXT"),
        ("cwe", "VARCHAR(255)"),
        ("owasp", "VARCHAR(255)"),
        ("help_uri", "VARCHAR(1000)"),
    ]:
        connection.execute(sql_text(
            f"ALTER TABLE findings ADD COLUMN IF NOT EXISTS {column} {ddl_type}"
        ))

# Same as above: enforce case-insensitive unique API key names per user at
# the DB level as a backstop (the API already rejects duplicates itself).
# Wrapped separately and tolerantly -- if an existing install already has
# duplicate names, this index creation fails and is skipped rather than
# blocking startup; it'll succeed once those duplicates are renamed.
try:
    with engine.begin() as connection:
        connection.execute(sql_text(
            "CREATE UNIQUE INDEX IF NOT EXISTS api_keys_user_id_name_lower_key "
            "ON api_keys (user_id, lower(name))"
        ))
except Exception as exc:
    print(
        "Warning: could not create unique index on api_keys(user_id, lower(name)) "
        f"-- likely pre-existing duplicate names: {exc}"
    )

app = FastAPI(
    title="ScanHive",
    version="0.1.0"
)

extra_cors_origins = [
    origin.strip()
    for origin in settings.EXTRA_CORS_ORIGINS.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        *extra_cors_origins,
    ],
    allow_origin_regex=(
        r"^https?://(localhost|127\.0\.0\.1|"
        r"10(?:\.\d{1,3}){3}|"
        r"192\.168(?:\.\d{1,3}){2}|"
        r"172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})"
        r"(?::\d+)?$"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(project_router)
app.include_router(scan_router)
app.include_router(finding_router)
app.include_router(dashboard_router)
app.include_router(iam_router)
app.include_router(api_key_router)

@app.get("/")
def root():
    return {
        "application": "ScanHive",
        "status": "Running"
    }


@app.get("/health")
def health():
    return {
        "database": "Connected",
        "status": "Healthy"
    }
