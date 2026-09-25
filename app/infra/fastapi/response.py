from __future__ import annotations

from typing import Any

from fastapi.responses import JSONResponse
from pydantic import BaseModel


class Response[T](BaseModel):
    """Generic response model used as response_model= on route handlers."""

    status: str
    code: int
    data: T


# ---------------------------------------------------------------------------
# Success helpers
# ---------------------------------------------------------------------------


class SuccessResponse(dict):  # type: ignore[type-arg]
    """Base class for success envelope dicts returned directly from route handlers."""

    def __init__(self, *, _code: int = 200, **data: Any) -> None:
        super().__init__(status="success", code=_code, data=data)


class ResourceFound(SuccessResponse):
    """200 OK success envelope."""

    def __init__(self, **data: Any) -> None:
        super().__init__(_code=200, **data)


class ResourceCreated(SuccessResponse):
    """201 Created success envelope."""

    def __init__(self, **data: Any) -> None:
        super().__init__(_code=201, **data)


# ---------------------------------------------------------------------------
# Error helpers
# ---------------------------------------------------------------------------


class ErrorResponse(JSONResponse):
    """Base class for error envelope JSON responses."""

    def __init__(
        self,
        *,
        status_code: int,
        message: str,
        data: dict[str, Any] | None = None,
    ) -> None:
        content: dict[str, Any] = {
            "status": "fail",
            "code": status_code,
            "error": {"message": message},
        }
        if data is not None:
            content["data"] = data
        super().__init__(status_code=status_code, content=content)


class ResourceNotFound(ErrorResponse):
    """404 Not Found error envelope."""

    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(status_code=404, message=message)


class ResourceExists(ErrorResponse):
    """409 Conflict error envelope."""

    def __init__(self, message: str = "Resource already exists") -> None:
        super().__init__(status_code=409, message=message)


class ResourceValidationError(ErrorResponse):
    """422 Unprocessable Entity error envelope."""

    def __init__(self, message: str = "Validation error") -> None:
        super().__init__(status_code=422, message=message)
