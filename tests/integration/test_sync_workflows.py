from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.dispatcher.limiter import TokenBucketRateLimiter
from app.core.sync.service import SyncService
from app.infra.sqlite.database import Sqlite
from app.plugins.github.client import GitHubClient
from app.runner.app import create_app
from app.runner.container import AppContainer


def _make_gh_repo(gh_id: int, name: str, owner: str) -> dict[str, Any]:
    return {
        "id": gh_id,
        "name": name,
        "full_name": f"{owner}/{name}",
        "owner": {"login": owner},
        "default_branch": "main",
        "html_url": f"https://github.com/{owner}/{name}",
        "archived": False,
        "disabled": False,
    }


def _make_gh_workflow(gh_id: int, name: str, path: str) -> dict[str, Any]:
    return {
        "id": gh_id,
        "name": name,
        "path": path,
        "state": "active",
        "html_url": f"https://github.com/acme/repo/actions/workflows/{path}",
    }


_DISPATCH_YAML = (
    "on:\n"
    "  workflow_dispatch:\n"
    "jobs:\n"
    "  build:\n"
    "    runs-on: ubuntu-latest\n"
    "    steps: []\n"
)


@pytest.fixture
async def sync_client(settings: Any, database: Sqlite) -> AsyncGenerator[AsyncClient]:
    """Client with a mocked GitHubClient that returns two repos."""
    rate_limiter = TokenBucketRateLimiter(rate=10.0, capacity=10)

    mock_gh = AsyncMock(spec=GitHubClient)
    mock_gh.org = "acme"

    payments_repo = _make_gh_repo(1001, "payments", "acme")
    analytics_repo = _make_gh_repo(1002, "analytics", "acme")
    mock_gh.list_org_repositories.return_value = [payments_repo, analytics_repo]

    ci_wf = _make_gh_workflow(501, "CI", ".github/workflows/ci.yml")
    mock_gh.list_repo_workflows.return_value = [ci_wf]
    mock_gh.get_workflow_file.return_value = (_DISPATCH_YAML, "abc123")

    sync_service = SyncService(uow_factory=database.uow, github_client=mock_gh)

    container = AppContainer(
        database=database,
        rate_limiter=rate_limiter,
        github_client=mock_gh,
        sync_service=sync_service,
    )
    app = create_app(settings=settings, container=container)
    async with (
        AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c,
        app.router.lifespan_context(app),
    ):
        yield c


@pytest.fixture
async def unconfigured_client(
    settings: Any, database: Sqlite
) -> AsyncGenerator[AsyncClient]:
    """Client whose GitHubClient has empty config, so sync raises NotConfigured."""
    rate_limiter = TokenBucketRateLimiter(rate=10.0, capacity=10)
    # Real client with empty config
    from app.plugins.github.client import GitHubClient as RealClient

    gh_client = RealClient(
        app_id="",
        private_key="",
        org="",
        installation_id=0,
        rate_limiter=rate_limiter,
    )
    sync_service = SyncService(uow_factory=database.uow, github_client=gh_client)
    container = AppContainer(
        database=database,
        rate_limiter=rate_limiter,
        github_client=gh_client,
        sync_service=sync_service,
    )
    app = create_app(settings=settings, container=container)
    async with (
        AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c,
        app.router.lifespan_context(app),
    ):
        yield c


async def test_sync_and_query_workflows(sync_client: AsyncClient) -> None:
    # Call POST /repositories/sync
    resp = await sync_client.post("/repositories/sync")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["repositories_synced"] == 2
    assert data["workflows_synced"] == 2

    # GET /workflows?repository.full_name[ilike]=%pay%
    resp = await sync_client.get(
        "/workflows", params={"repository.full_name[ilike]": "%pay%"}
    )
    assert resp.status_code == 200
    body = resp.json()
    workflows = body["data"]["workflows"]
    assert len(workflows) == 1
    assert workflows[0]["name"] == "CI"
    assert workflows[0]["is_dispatchable"] is True
    assert workflows[0]["repository"]["full_name"] == "acme/payments"


async def test_unconfigured_github_returns_503(
    unconfigured_client: AsyncClient,
) -> None:
    resp = await unconfigured_client.post("/repositories/sync")
    assert resp.status_code == 503
