from __future__ import annotations

from fastapi import FastAPI

from app.infra.fastapi.health.router import router as health_router
from app.infra.fastapi.root.router import router as root_router
from app.runner.fastapi import SchedulerApi
from app.runner.settings import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create and return the configured FastAPI application.

    Used by tests and the CLI alike.
    """
    if settings is None:
        settings = Settings()

    return (
        SchedulerApi(settings)
        .with_router(root_router)
        .with_router(health_router)
        .build()
    )
