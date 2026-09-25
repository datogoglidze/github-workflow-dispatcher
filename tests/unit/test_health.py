from __future__ import annotations

from httpx import ASGITransport, AsyncClient

from app.runner.app import create_app


async def make_client(app=None):  # type: ignore[no-untyped-def]
    if app is None:
        app = create_app()
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def test_health_returns_healthy() -> None:
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    # Health endpoint is un-enveloped
    assert "code" not in body
    assert "data" not in body
