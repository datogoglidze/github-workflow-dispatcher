from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.dispatcher.limiter import TokenBucketRateLimiter
from app.core.dispatcher.service import DispatcherService
from app.core.sync.service import SyncService
from app.infra.scheduler.cron import apscheduler_cron
from app.infra.scheduler.service import SchedulerService
from app.infra.sqlite.database import Sqlite
from app.plugins.github.client import GitHubClient, WorkflowDispatchResult
from app.runner.app import create_app
from app.runner.container import AppContainer
from app.runner.settings import Settings

_CRON = "0 0 1 1 *"
_RUN_URL = "https://github.com/acme/payments/actions/runs/42"
_REMOVED = (
    "Workflow removed from repository on GitHub (HTTP 404). "
    "Schedule automatically disabled."
)

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
async def schedule_client(
    settings: Settings, database: Sqlite
) -> AsyncGenerator[tuple[AsyncClient, AsyncMock]]:
    app_settings = Settings(
        database_url=settings.database_url,
        database_migrate=False,
        jitter_min_seconds=0,
        jitter_max_seconds=0,
        sync_interval_hours=0,
    )
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

    scheduler = SchedulerService(uow_factory=database.uow, sync_interval_hours=0)
    dispatcher = DispatcherService(
        uow_factory=database.uow,
        github_client=mock_gh,
        cron=apscheduler_cron,
        jitter_min_seconds=0,
        jitter_max_seconds=0,
        on_schedule_disabled=scheduler.remove_schedule_job,
    )
    sync_service = SyncService(
        uow_factory=database.uow,
        github_client=mock_gh,
        on_schedule_disabled=scheduler.remove_schedule_job,
    )
    scheduler.dispatcher_service = dispatcher
    scheduler.sync_service = sync_service
    container = AppContainer(
        database=database,
        rate_limiter=rate_limiter,
        github_client=mock_gh,
        sync_service=sync_service,
        dispatcher_service=dispatcher,
        scheduler_service=scheduler,
    )
    app = create_app(settings=app_settings, container=container)
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


async def _create_schedule(client: AsyncClient, workflow_id: str) -> dict[str, Any]:
    resp = await client.post(
        "/schedules",
        json={"workflow_id": workflow_id, "cron_expression": _CRON, "ref": "main"},
    )
    assert resp.status_code == 201, resp.text
    payload: dict[str, Any] = resp.json()
    schedule: dict[str, Any] = payload["data"]["schedule"]
    return schedule


async def test_schedule_crud(schedule_client: tuple[AsyncClient, AsyncMock]) -> None:
    client, _mock = schedule_client
    await _sync(client)
    workflow_id = await _workflow_id(client, "CI")

    created = await _create_schedule(client, workflow_id)
    schedule_id = created["id"]
    assert created["cron_expression"] == _CRON
    assert created["is_enabled"] is True
    assert created["next_run_at"] is not None
    assert created["workflow"]["name"] == "CI"
    assert created["workflow"]["repository"]["full_name"] == "acme/payments"

    listed = await client.get(
        "/schedules",
        params={
            "workflow.name": "CI",
            "workflow.repository.full_name": "acme/payments",
            "is_enabled": "true",
            "sort": "next_run_at",
        },
    )
    assert listed.status_code == 200, listed.text
    body = listed.json()["data"]
    assert body["total"] == 1
    assert body["schedules"][0]["id"] == schedule_id

    other = await client.get("/schedules", params={"workflow.name": "Lint"})
    assert other.status_code == 200, other.text
    assert other.json()["data"]["total"] == 0

    fetched = await client.get(f"/schedules/{schedule_id}")
    assert fetched.status_code == 200, fetched.text
    assert fetched.json()["data"]["schedule"]["id"] == schedule_id

    patched = await client.patch(
        f"/schedules/{schedule_id}",
        json={"ref": "develop"},
    )
    assert patched.status_code == 200, patched.text
    updated = patched.json()["data"]["schedule"]
    assert updated["ref"] == "develop"
    assert updated["cron_expression"] == _CRON
    assert updated["last_run_at"] is None

    deleted = await client.delete(f"/schedules/{schedule_id}")
    assert deleted.status_code == 204

    missing = await client.get(f"/schedules/{schedule_id}")
    assert missing.status_code == 404


async def test_invalid_cron_returns_422(
    schedule_client: tuple[AsyncClient, AsyncMock],
) -> None:
    client, _mock = schedule_client
    await _sync(client)
    workflow_id = await _workflow_id(client, "CI")

    resp = await client.post(
        "/schedules",
        json={"workflow_id": workflow_id, "cron_expression": "not a cron"},
    )
    assert resp.status_code == 422


async def test_health_jobs_count_tracks_schedule(
    schedule_client: tuple[AsyncClient, AsyncMock],
) -> None:
    client, _mock = schedule_client
    await _sync(client)
    workflow_id = await _workflow_id(client, "CI")

    before = (await client.get("/health")).json()
    assert before["scheduler"]["is_running"] is True
    assert "rate_per_second" in before["rate_limiter"]
    before_count = before["scheduler"]["jobs_count"]

    created = await _create_schedule(client, workflow_id)
    schedule_id = created["id"]
    job_id = f"schedule_{schedule_id}"

    enabled = (await client.get("/health")).json()["scheduler"]
    assert enabled["jobs_count"] == before_count + 1
    assert job_id in {job["id"] for job in enabled["jobs"]}

    disabled = await client.patch(
        f"/schedules/{schedule_id}",
        json={"is_enabled": False},
    )
    assert disabled.status_code == 200, disabled.text
    assert disabled.json()["data"]["schedule"]["is_enabled"] is False

    after = (await client.get("/health")).json()["scheduler"]
    assert after["jobs_count"] == before_count
    assert job_id not in {job["id"] for job in after["jobs"]}


async def test_manual_trigger_sets_schedule_id(
    schedule_client: tuple[AsyncClient, AsyncMock],
) -> None:
    client, _mock = schedule_client
    await _sync(client)
    workflow_id = await _workflow_id(client, "CI")
    created = await _create_schedule(client, workflow_id)

    resp = await client.post(f"/schedules/{created['id']}/trigger")
    assert resp.status_code == 200, resp.text
    log = resp.json()["data"]["log"]
    assert log["schedule_id"] == created["id"]
    assert log["schedule"]["id"] == created["id"]
    assert log["status_code"] == 200
    assert log["target"]["cron_expression"] == _CRON
    assert log["run_url"] == _RUN_URL


async def test_github_404_disables_schedule_and_removes_job(
    schedule_client: tuple[AsyncClient, AsyncMock],
) -> None:
    client, mock_gh = schedule_client
    mock_gh.dispatch_workflow.return_value = WorkflowDispatchResult(
        status_code=404,
        body="not found",
        run_url=None,
    )
    await _sync(client)
    workflow_id = await _workflow_id(client, "CI")
    created = await _create_schedule(client, workflow_id)
    schedule_id = created["id"]

    resp = await client.post(f"/schedules/{schedule_id}/trigger")
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["log"]["error_message"] == _REMOVED

    fetched = await client.get(f"/schedules/{schedule_id}")
    assert fetched.status_code == 200, fetched.text
    schedule = fetched.json()["data"]["schedule"]
    assert schedule["is_enabled"] is False

    workflow = await client.get(f"/workflows/{workflow_id}")
    assert workflow.json()["data"]["workflow"]["state"] == "deleted"
    assert workflow.json()["data"]["workflow"]["is_dispatchable"] is False

    health = (await client.get("/health")).json()["scheduler"]
    assert f"schedule_{schedule_id}" not in {job["id"] for job in health["jobs"]}


async def test_deleted_schedule_log_keeps_target(
    schedule_client: tuple[AsyncClient, AsyncMock],
) -> None:
    client, _mock = schedule_client
    await _sync(client)
    workflow_id = await _workflow_id(client, "CI")
    created = await _create_schedule(client, workflow_id)
    schedule_id = created["id"]

    triggered = await client.post(f"/schedules/{schedule_id}/trigger")
    assert triggered.status_code == 200, triggered.text
    log = triggered.json()["data"]["log"]
    log_id = log["id"]

    deleted = await client.delete(f"/schedules/{schedule_id}")
    assert deleted.status_code == 204

    fetched = await client.get(f"/logs/{log_id}")
    assert fetched.status_code == 200, fetched.text
    saved = fetched.json()["data"]["log"]
    assert saved["schedule"] is None
    assert saved["schedule_id"] is None
    assert saved["target"]["repository_full_name"] == "acme/payments"
    assert saved["target"]["workflow_name"] == "CI"
    assert saved["target"]["cron_expression"] == _CRON

    missing = await client.post(f"/schedules/{schedule_id}/trigger")
    assert missing.status_code == 404
