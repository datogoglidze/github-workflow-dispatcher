from __future__ import annotations

import shutil
from collections.abc import AsyncGenerator
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.repositories.entities import Repository
from app.infra.alembic import Alembic
from app.infra.sqlite.database import Sqlite
from app.runner.app import create_app
from app.runner.container import AppContainer
from app.runner.settings import Settings

# ---------------------------------------------------------------------------
# Session-scoped template database — migrated once, copied per test
# ---------------------------------------------------------------------------

_TEMPLATE_DB_PATH = Path(__file__).parent / "_template.sqlite"


@pytest.fixture(scope="session", autouse=True)
def _build_template_db() -> None:
    """Create and migrate the template database once per test session."""
    _TEMPLATE_DB_PATH.unlink(missing_ok=True)
    url = f"sqlite:///{_TEMPLATE_DB_PATH}"
    Alembic.for_database(url).upgrade("head")


@pytest.fixture
def db_path(tmp_path: Path) -> Path:
    """Copy the migrated template into a fresh tmp_path for each test."""
    dest = tmp_path / "test.sqlite"
    shutil.copy2(_TEMPLATE_DB_PATH, dest)
    return dest


@pytest.fixture
def settings(db_path: Path) -> Settings:
    return Settings(
        database_url=f"sqlite:///{db_path}",
        database_migrate=False,
    )


@pytest.fixture
def database(settings: Settings) -> Sqlite:
    return Sqlite(database_url=settings.database_url)


@pytest.fixture
async def client(settings: Settings, database: Sqlite) -> AsyncGenerator[AsyncClient]:
    container = AppContainer(database=database)
    app = create_app(settings=settings, container=container)
    async with (
        AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c,
        app.router.lifespan_context(app),
    ):
        yield c


def seed_repositories(database: Sqlite, *repos: Repository) -> None:
    """Insert repositories via the Unit of Work."""
    with database.uow() as uow:
        for repo in repos:
            uow.repositories.create_one(repo)
