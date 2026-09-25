from __future__ import annotations

from fastapi import FastAPI

from app.infra.fastapi.health.router import router as health_router
from app.infra.fastapi.logs.router import router as logs_router
from app.infra.fastapi.repositories.router import router as repositories_router
from app.infra.fastapi.root.router import router as root_router
from app.infra.fastapi.workflows.router import router as workflows_router
from app.runner.container import AppContainer
from app.runner.fastapi import SchedulerApi
from app.runner.settings import Settings


def create_app(
    settings: Settings | None = None,
    container: AppContainer | None = None,
) -> FastAPI:
    """Create and return the configured FastAPI application.

    Used by tests and the CLI alike.
    """
    if settings is None:
        settings = Settings()
    if container is None:
        container = AppContainer.build(settings)

    return (
        SchedulerApi(
            settings,
            container.database,
            sync_service=container.sync_service,
            dispatcher_service=container.dispatcher_service,
        )
        .with_router(root_router)
        .with_router(health_router)
        .with_router(repositories_router)
        .with_router(workflows_router)
        .with_router(logs_router)
        .build()
    )
