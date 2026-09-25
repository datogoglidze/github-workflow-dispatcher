from __future__ import annotations

import uvicorn
from fastapi import FastAPI
from fastapi.routing import APIRouter

from app.infra.fastapi.app import create_api
from app.runner.settings import Settings


class SchedulerApi:
    """Builder for the FastAPI application."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
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
        return create_api(routers=self._routers, cors_origins=self._origins)


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
