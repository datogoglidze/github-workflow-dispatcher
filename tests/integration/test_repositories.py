from __future__ import annotations

from datetime import UTC, datetime

from httpx import AsyncClient

from tests.integration.conftest import seed_repositories

from app.core.repositories.entities import Repository
from app.infra.sqlite.database import Sqlite


async def test_list_repositories_empty(client: AsyncClient) -> None:
    response = await client.get("/repositories")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["code"] == 200
    data = body["data"]
    assert data["repositories"] == []
    assert data["count"] == 0
    assert data["total"] == 0
    assert data["limit"] == 100
    assert data["offset"] == 0


async def test_list_repositories_seeded(client: AsyncClient, database: Sqlite) -> None:
    repo1 = Repository(name="alpha", full_name="org/alpha", default_branch="main")
    repo2 = Repository(name="beta", full_name="org/beta", default_branch="main")
    seed_repositories(database, repo1, repo2)

    response = await client.get("/repositories")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 2
    assert data["count"] == 2
    assert len(data["repositories"]) == 2
    names = {r["name"] for r in data["repositories"]}
    assert names == {"alpha", "beta"}


async def test_list_repositories_pagination(
    client: AsyncClient, database: Sqlite
) -> None:
    repos = [
        Repository(name=f"repo{i}", full_name=f"org/repo{i}", default_branch="main")
        for i in range(5)
    ]
    seed_repositories(database, *repos)

    response = await client.get("/repositories?limit=2&offset=1")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 5
    assert data["count"] == 2
    assert data["limit"] == 2
    assert data["offset"] == 1


async def test_get_repository(client: AsyncClient, database: Sqlite) -> None:
    repo = Repository(
        name="myrepo",
        full_name="org/myrepo",
        default_branch="main",
        github_repository_id=42,
        url="https://github.com/org/myrepo",
    )
    seed_repositories(database, repo)

    response = await client.get(f"/repositories/{repo.id}")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    r = body["data"]["repository"]
    assert r["id"] == repo.id
    assert r["name"] == "myrepo"
    assert r["full_name"] == "org/myrepo"
    assert r["github_repository_id"] == 42
    assert r["url"] == "https://github.com/org/myrepo"


async def test_get_repository_not_found(client: AsyncClient) -> None:
    response = await client.get("/repositories/nonexistent-id")
    assert response.status_code == 404
    body = response.json()
    assert body["status"] == "fail"
    assert body["code"] == 404
    assert "not found" in body["error"]["message"].lower()


async def test_datetime_serialized_with_offset(
    client: AsyncClient, database: Sqlite
) -> None:
    synced = datetime(2024, 6, 15, 12, 0, 0, tzinfo=UTC)
    repo = Repository(
        name="dated",
        full_name="org/dated",
        default_branch="main",
        last_synced_at=synced,
    )
    seed_repositories(database, repo)

    response = await client.get(f"/repositories/{repo.id}")
    assert response.status_code == 200
    r = response.json()["data"]["repository"]
    # Must include a UTC offset (+00:00 or Z), not be a naive ISO string
    assert r["last_synced_at"] is not None
    assert "+" in r["last_synced_at"] or r["last_synced_at"].endswith("Z")
