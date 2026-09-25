from __future__ import annotations

from fastapi import FastAPI, Request

from app.core.errors import DoesNotExistError
from app.infra.fastapi.response import ResourceNotFound, ResourceValidationError


def setup_exception_handlers(app: FastAPI) -> None:
    """Register exception handlers on the FastAPI application."""

    @app.exception_handler(ValueError)
    async def value_error_handler(
        _request: Request, exc: ValueError
    ) -> ResourceValidationError:
        return ResourceValidationError(message=str(exc))

    @app.exception_handler(DoesNotExistError)
    async def does_not_exist_handler(
        _request: Request, exc: DoesNotExistError
    ) -> ResourceNotFound:
        return ResourceNotFound(message=f"{exc.entity} with id {exc.id} not found")
