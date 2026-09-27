"""FastAPI application entrypoint."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.api import api_router
from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.core.logging import configure_logging, get_logger


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    log = get_logger("startup")
    log.info("harmonyhub_starting", version=__version__, env=get_settings().environment)
    yield
    log.info("harmonyhub_shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="HarmonyHub API",
        version=__version__,
        description=(
            "Production API for HarmonyHub — musicians' platform for songs, "
            "chords, lyrics, audio analysis, and practice."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.api_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    install_error_handlers(app)

    @app.get("/", tags=["meta"], summary="API root")
    def root() -> dict[str, str]:
        return {
            "name": "HarmonyHub API",
            "version": __version__,
            "docs": "/docs",
            "health": "/healthz",
        }

    @app.get("/healthz", tags=["meta"], summary="Liveness probe")
    def healthz() -> dict[str, str]:
        return {"status": "ok", "version": __version__}

    @app.get("/readyz", tags=["meta"], summary="Readiness probe")
    def readyz() -> JSONResponse:
        # In a real deployment this would also check DB & Redis.
        return JSONResponse({"status": "ready"})

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
