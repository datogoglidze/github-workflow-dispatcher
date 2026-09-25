from __future__ import annotations

import json
from typing import Any

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.infra.fastapi.response import (
    ErrorResponse,
    ResourceCreated,
    ResourceExists,
    ResourceFound,
    ResourceNotFound,
    ResourceValidationError,
)

# ---------------------------------------------------------------------------
# Unit tests: response helpers
# ---------------------------------------------------------------------------


def test_resource_found_envelope() -> None:
    r = ResourceFound(foo="bar", count=1)
    assert r["status"] == "success"
    assert r["code"] == 200
    assert r["data"] == {"foo": "bar", "count": 1}


def test_resource_created_envelope() -> None:
    r = ResourceCreated(id="abc")
    assert r["status"] == "success"
    assert r["code"] == 201
    assert r["data"] == {"id": "abc"}


def test_error_response_shape() -> None:
    r = ResourceNotFound("not here")
    assert r.status_code == 404
    body = json.loads(bytes(r.body))
    assert body["status"] == "fail"
    assert body["code"] == 404
    assert body["error"]["message"] == "not here"


def test_resource_exists_shape() -> None:
    r = ResourceExists()
    assert r.status_code == 409


def test_resource_validation_error_shape() -> None:
    r = ResourceValidationError("bad input")
    assert r.status_code == 422
    body = json.loads(bytes(r.body))
    assert body["error"]["message"] == "bad input"


def test_error_response_with_data() -> None:
    r = ErrorResponse(status_code=400, message="oops", data={"field": "value"})
    body = json.loads(bytes(r.body))
    assert body["data"] == {"field": "value"}


# ---------------------------------------------------------------------------
# Integration test: ValueError → 422 handler
# ---------------------------------------------------------------------------


async def make_test_app() -> FastAPI:
    from fastapi import APIRouter

    from app.infra.fastapi.health.router import router as health_router
    from app.infra.fastapi.root.router import router as root_router
    from app.runner.fastapi import SchedulerApi
    from app.runner.settings import Settings

    settings = Settings()

    extra = APIRouter()

    @extra.get("/explode", response_model=None)
    async def explode() -> dict[str, Any]:
        raise ValueError("something went wrong")

    return (
        SchedulerApi(settings)
        .with_router(root_router)
        .with_router(health_router)
        .with_router(extra)
        .build()
    )


async def test_value_error_returns_422_envelope() -> None:
    app = await make_test_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/explode")

    assert response.status_code == 422
    body = response.json()
    assert body["status"] == "fail"
    assert body["code"] == 422
    assert body["error"]["message"] == "something went wrong"
