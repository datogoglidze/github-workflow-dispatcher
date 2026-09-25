from __future__ import annotations

from typing import Any

import uvicorn
from fastapi import FastAPI
from fastapi.routing import APIRouter

from app.infra.fastapi.app import create_api
from app.infra.sqlite.database import Sqlite
from app.runner.settings import Settings


class SchedulerApi:
    """Builder for the FastAPI application."""

    def __init__(
        self,
        settings: Settings,
        database: Sqlite,
        sync_service: Any = None,
        dispatcher_service: Any = None,
        scheduler_service: Any = None,
        rate_limiter: Any = None,
    ) -> None:
        self._settings = settings
        self._database = database
        self._sync_service = sync_service
        self._dispatcher_service = dispatcher_service
        self._scheduler_service = scheduler_service
        self._rate_limiter = rate_limiter
        self._routers: list[APIRouter] = []
        self._origins: list[str] = list(settings.cors_origins)

    def with_router(self, router: APIRouter) -> SchedulerApi:
        self._routers.append(router)
        return self

    def with_frontend(self, origin: str) -> SchedulerApi:
        stripped = origin.strip()
        if stripped and stripped not in self._origins:
            self._origins.append(stripped)
        return self

    def build(self) -> FastAPI:
        return create_api(
            routers=self._routers,
            cors_origins=self._origins,
            database=self._database,
            database_migrate=self._settings.database_migrate,
            sync_service=self._sync_service,
            dispatcher_service=self._dispatcher_service,
            scheduler_service=self._scheduler_service,
            rate_limiter=self._rate_limiter,
        )


class UvicornServer:
    """Builder for Uvicorn server configuration."""

    def __init__(self) -> None:
        self._host = "127.0.0.1"
        self._port = 8000
        self._root_path = ""

    def with_host(self, host: str) -> UvicornServer:
        self._host = host
        return self

    def with_port(self, port: int) -> UvicornServer:
        self._port = port
        return self

    def with_path(self, root_path: str) -> UvicornServer:
        self._root_path = root_path
        return self

    def run(self, api: FastAPI) -> None:
        # Single worker only: the APScheduler runs in-process.
        # Multiple workers would create duplicate scheduler instances.
        api.root_path = self._root_path
        uvicorn.run(api, host=self._host, port=self._port, workers=1)
