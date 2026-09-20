import logging
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.api import auth, ingestion, reports
from app.core.config import get_settings
from app.db import models
from app.db.session import engine

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if get_settings().is_prod:
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains"
            )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """In-memory sliding-window rate limiter for expensive endpoints."""

    def __init__(self, app, requests: int, window_seconds: int, paths: tuple):
        super().__init__(app)
        self.requests = requests
        self.window = window_seconds
        self.paths = paths
        self.hits: dict[str, deque] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if request.method == "POST" and request.url.path in self.paths:
            ip = request.client.host if request.client else "unknown"
            now = time.monotonic()
            dq = self.hits[ip]
            while dq and dq[0] <= now - self.window:
                dq.popleft()
            if len(dq) >= self.requests:
                return JSONResponse(
                    status_code=429, content={"detail": "Too many requests, slow down."}
                )
            dq.append(now)
            if len(self.hits) > 10_000:  # crude memory cap
                self.hits.clear()
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logging.basicConfig(
        level=logging.INFO if settings.is_prod else logging.DEBUG,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    if settings.AUTO_CREATE_TABLES:
        if settings.is_prod:
            logger.warning(
                "AUTO_CREATE_TABLES is on in production — prefer migrations (Alembic)."
            )
        models.Base.metadata.create_all(bind=engine)
        logger.info("Database tables ensured.")
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Eivanta Code API",
        lifespan=lifespan,
        # Interactive docs are a dev convenience; never expose them in prod.
        docs_url=None if settings.is_prod else "/docs",
        redoc_url=None if settings.is_prod else "/redoc",
        openapi_url=None if settings.is_prod else "/openapi.json",
    )

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        RateLimitMiddleware,
        requests=settings.RATE_LIMIT_REQUESTS,
        window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
        paths=("/api/v1/ingestion/upload", "/api/v1/auth/pin-login"),
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts_list)
    app.add_middleware(
        CORSMiddleware,
        # Explicit origins only. "*" + allow_credentials was rejected by
        # browsers anyway and leaked the API to every website.
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    @app.get("/api/v1/health", tags=["Health"])
    def health():
        return {"status": "ok", "environment": settings.ENVIRONMENT}

    api_router = APIRouter(prefix="/api/v1")
    api_router.include_router(auth.router)
    api_router.include_router(ingestion.router)
    api_router.include_router(reports.router)
    app.include_router(api_router)

    # Serve uploaded evidence photos (dev convenience). In production, put
    # UPLOAD_DIR on object storage (S3/GCS) behind a CDN instead.
    # The directory must exist at mount time (lifespan runs after mounting).
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

    return app


app = create_app()
