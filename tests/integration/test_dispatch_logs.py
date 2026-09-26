from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator
from typing import Any
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.dispatcher.limiter import TokenBucketRateLimiter
from app.core.dispatcher.service import DispatcherService
from app.core.sync.service import SyncService
from app.infra.scheduler.cron import apscheduler_cron
from app.infra.sqlite.database import Sqlite
from app.plugins.github.client import GitHubClient, WorkflowDispatchResult
from app.runner.app import create_app
from app.runner.container import AppContainer

_RUN_URL = "https://github.com/acme/payments/actions/runs/42"

_DISPATCH_YAML = (
    "on:\n"
    "  workflow_dispatch:\n"
    "jobs:\n"
    "  build:\n"
    "    runs-on: ubuntu-latest\n"
    "    steps: []\n"
)

_PUSH_YAML = "on:\n  push:\njobs:\n  lint:\n    runs-on: ubuntu-latest\n    steps: []\n"


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
        "html_url": f"https://github.com/acme/payments/actions/workflows/{path}",
    }


def _workflow_file(_owner: str, _repo: str, path: str) -> tuple[str, str]:
    if path.endswith("lint.yml"):
        return _PUSH_YAML, "lintsha"
    return _DISPATCH_YAML, "abc123"


@pytest.fixture
async def dispatch_client(
    settings: Any, database: Sqlite
) -> AsyncGenerator[tuple[AsyncClient, AsyncMock]]:
    rate_limiter = TokenBucketRateLimiter(rate=10.0, capacity=10)
    mock_gh = AsyncMock(spec=GitHubClient)
    mock_gh.org = "acme"
    mock_gh.list_org_repositories.return_value = [
        _make_gh_repo(1001, "payments", "acme")
    ]
    mock_gh.list_repo_workflows.return_value = [
        _make_gh_workflow(501, "CI", ".github/workflows/ci.yml"),
        _make_gh_workflow(502, "Deploy", ".github/workflows/deploy.yml"),
        _make_gh_workflow(503, "Lint", ".github/workflows/lint.yml"),
    ]
    mock_gh.get_workflow_file.side_effect = _workflow_file
    mock_gh.dispatch_workflow.return_value = WorkflowDispatchResult(
        status_code=200,
        body="accepted",
        run_url=_RUN_URL,
    )

    sync_service = SyncService(uow_factory=database.uow, github_client=mock_gh)
    dispatcher = DispatcherService(
        uow_factory=database.uow,
        github_client=mock_gh,
        cron=apscheduler_cron,
    )
    container = AppContainer(
        database=database,
        rate_limiter=rate_limiter,
        github_client=mock_gh,
        sync_service=sync_service,
        dispatcher_service=dispatcher,
    )
    app = create_app(settings=settings, container=container)
    async with (
        AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client,
        app.router.lifespan_context(app),
    ):
        yield client, mock_gh


async def _sync(client: AsyncClient) -> None:
    resp = await client.post("/repositories/sync")
    assert resp.status_code == 200, resp.text


async def _workflow_id(client: AsyncClient, name: str) -> str:
    resp = await client.get("/workflows", params={"name": name})
    assert resp.status_code == 200, resp.text
    matches = [
        item for item in resp.json()["data"]["workflows"] if item["name"] == name
    ]
    assert len(matches) == 1
    return str(matches[0]["id"])


async def test_trigger_with_and_without_body(
    dispatch_client: tuple[AsyncClient, AsyncMock],
) -> None:
    client, _mock = dispatch_client
    await _sync(client)
    workflow_id = await _workflow_id(client, "CI")

    bare = await client.post(f"/workflows/{workflow_id}/trigger")
    assert bare.status_code == 200, bare.text
    bare_log = bare.json()["data"]["log"]
    assert bare_log["target"]["resolved_ref"] == "main"
    assert bare_log["run_url"] == _RUN_URL
    assert bare_log["schedule"] is None

    specified = await client.post(
        f"/workflows/{workflow_id}/trigger",
        json={"ref": "develop", "inputs": {"debug": True}},
    )
    assert specified.status_code == 200, specified.text
    specified_log = specified.json()["data"]["log"]
    assert specified_log["target"]["resolved_ref"] == "develop"
    assert specified_log["run_url"] == _RUN_URL


async def test_github_rejection_still_returns_200(
    dispatch_client: tuple[AsyncClient, AsyncMock],
) -> None:
    client, mock_gh = dispatch_client
    mock_gh.dispatch_workflow.return_value = WorkflowDispatchResult(
        status_code=500,
        body="internal error",
        run_url=None,
    )
    await _sync(client)
    workflow_id = await _workflow_id(client, "CI")

    resp = await client.post(f"/workflows/{workflow_id}/trigger")
    assert resp.status_code == 200, resp.text
    log = resp.json()["data"]["log"]
    assert log["status_code"] == 500
    assert log["error_message"] == (
        "GitHub dispatch failed with HTTP 500: internal error"
    )


async def test_non_dispatchable_workflow_returns_422(
    dispatch_client: tuple[AsyncClient, AsyncMock],
) -> None:
    client, _mock = dispatch_client
    await _sync(client)
    workflow_id = await _workflow_id(client, "Lint")

    resp = await client.post(f"/workflows/{workflow_id}/trigger")
    assert resp.status_code == 422


async def test_logs_newest_first_and_workflow_name_filter(
    dispatch_client: tuple[AsyncClient, AsyncMock],
) -> None:
    client, _mock = dispatch_client
    await _sync(client)
    ci_id = await _workflow_id(client, "CI")
    deploy_id = await _workflow_id(client, "Deploy")

    first = await client.post(f"/workflows/{ci_id}/trigger")
    assert first.status_code == 200, first.text
    await asyncio.sleep(0.02)
    second = await client.post(
        f"/workflows/{deploy_id}/trigger", json={"ref": "release"}
    )
    assert second.status_code == 200, second.text

    listed = await client.get("/logs")
    assert listed.status_code == 200, listed.text
    logs = listed.json()["data"]["logs"]
    assert [item["target"]["workflow_name"] for item in logs] == ["Deploy", "CI"]

    filtered = await client.get("/logs", params={"workflow_name": "CI"})
    assert filtered.status_code == 200, filtered.text
    matched = filtered.json()["data"]["logs"]
    assert len(matched) == 1
    assert matched[0]["target"]["workflow_name"] == "CI"
