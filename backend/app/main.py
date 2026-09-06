from fastapi import FastAPI

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
from fastapi.middleware.cors import CORSMiddleware



Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ScanHive",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
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
