from __future__ import annotations

import logging
import time
from collections.abc import AsyncGenerator, Callable
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter
from starlette.requests import Request
from starlette.responses import Response

from app.infra.fastapi.errors import setup_exception_handlers

_logger = logging.getLogger(__name__)


def create_api(
    *,
    routers: list[APIRouter],
    cors_origins: list[str],
    lifespan_hooks: list[Callable[[], AsyncGenerator[None]]] | None = None,
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
        _logger.info("Starting github-workflow-dispatcher API")
        if lifespan_hooks:
            for hook in lifespan_hooks:
                async for _ in hook():
                    pass
        yield
        _logger.info("Stopped github-workflow-dispatcher API")

    app = FastAPI(
        title="GitHub Workflow Dispatcher & Scheduler",
        version="0.1.0",
        swagger_ui_parameters={"docExpansion": "none"},
        lifespan=lifespan,
    )

    # CORS — allow_credentials only when wildcard is NOT present
    allow_credentials = "*" not in cors_origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # HTTP request logging middleware
    @app.middleware("http")
    async def log_requests(
        request: Request, call_next: Callable[[Request], Any]
    ) -> Response:
        start = time.perf_counter()
        response: Response = await call_next(request)
        duration = time.perf_counter() - start
        _logger.info(
            "%s %s completed with %s in %.3fs",
            request.method,
            request.url.path,
            response.status_code,
            duration,
        )
        return response

    for router in routers:
        app.include_router(router)

    setup_exception_handlers(app)

    return app
