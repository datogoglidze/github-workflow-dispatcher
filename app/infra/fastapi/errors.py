from __future__ import annotations

from fastapi import FastAPI, Request

from app.infra.fastapi.response import ResourceValidationError


def setup_exception_handlers(app: FastAPI) -> None:
    """Register exception handlers on the FastAPI application."""

    @app.exception_handler(ValueError)
    async def value_error_handler(
        _request: Request, exc: ValueError
    ) -> ResourceValidationError:
        return ResourceValidationError(message=str(exc))
