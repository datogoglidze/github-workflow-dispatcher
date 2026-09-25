from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import Response

from app.core.errors import (
    DoesNotExistError,
    GitHubApiError,
    GitHubNotConfiguredError,
    RateLimitExceededError,
)
from app.infra.fastapi.response import (
    ErrorResponse,
    ResourceNotFound,
    ResourceValidationError,
)


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

    @app.exception_handler(GitHubApiError)
    async def github_api_error_handler(
        _request: Request, exc: GitHubApiError
    ) -> ErrorResponse:
        status_code = 502 if exc.status_code >= 500 else exc.status_code
        return ErrorResponse(status_code=status_code, message=str(exc))

    @app.exception_handler(RateLimitExceededError)
    async def rate_limit_handler(
        _request: Request, exc: RateLimitExceededError
    ) -> Response:
        return ErrorResponse(
            status_code=429,
            message=str(exc),
            data={"retry_after": exc.retry_after},
        )

    @app.exception_handler(GitHubNotConfiguredError)
    async def github_not_configured_handler(
        _request: Request, exc: GitHubNotConfiguredError
    ) -> ErrorResponse:
        return ErrorResponse(status_code=503, message=str(exc))
