from __future__ import annotations

from httpx import ASGITransport, AsyncClient

from app.runner.app import create_app


async def test_root_returns_success_envelope() -> None:
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["code"] == 200
    assert body["data"]["message"] == "Hello, World!"
    assert body["data"]["service"] == "github-workflow-dispatcher"
    assert body["data"]["version"] == "0.1.0"
    assert body["data"]["docs"] == "/docs"
