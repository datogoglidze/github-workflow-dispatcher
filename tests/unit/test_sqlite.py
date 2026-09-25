from __future__ import annotations

from datetime import UTC, datetime

import pytest
from sqlalchemy import String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

from app.core.repositories.entities import Repository
from app.infra.sqlite.database import Sqlite
from app.infra.sqlite.types import UtcDateTime


# ---------------------------------------------------------------------------
# Module-level model for UtcDateTime round-trip test.
# Must be at module scope so SQLAlchemy can resolve Mapped[] annotations
# (from __future__ import annotations makes them strings; they are resolved
# against module globals, not local function scope).
# ---------------------------------------------------------------------------
class _UtcBase(DeclarativeBase):
    pass


class _UtcModel(_UtcBase):
    __tablename__ = "test_utc"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ts: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)


def make_in_memory_db() -> Sqlite:
    db = Sqlite(database_url="sqlite://")
    from app.infra.sqlite import Base

    Base.metadata.create_all(db.engine)
    return db


def test_uow_commits_on_success() -> None:
    db = make_in_memory_db()
    repo = Repository(name="r", full_name="o/r", default_branch="main")

    with db.uow() as uow:
        uow.repositories.create_one(repo)

    # Read back in a fresh UoW — should persist
    with db.uow() as uow:
        result = uow.repositories.read_one(repo.id)
    assert result is not None
    assert result.id == repo.id


def _uow_rollback_scenario(db: Sqlite, repo: Repository) -> None:
    with db.uow() as uow:
        uow.repositories.create_one(repo)
        raise RuntimeError("intentional")


def test_uow_rolls_back_on_exception() -> None:
    db = make_in_memory_db()
    repo = Repository(name="r", full_name="o/r", default_branch="main")

    with pytest.raises(RuntimeError):
        _uow_rollback_scenario(db, repo)

    with db.uow() as uow:
        result = uow.repositories.read_one(repo.id)
    assert result is None


def _uow_reentry_scenario(uow: object) -> None:
    with uow:  # type: ignore[attr-defined]
        pass


def test_uow_reentry_raises() -> None:
    db = make_in_memory_db()
    uow = db.uow()
    with uow, pytest.raises(RuntimeError, match="already active"):
        _uow_reentry_scenario(uow)


def test_utcdatetime_round_trip() -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    _UtcBase.metadata.create_all(engine)

    original = datetime(2024, 1, 15, 10, 30, 0, tzinfo=UTC)
    with Session(engine) as session:
        session.add(_UtcModel(id="1", ts=original))
        session.commit()

    with Session(engine) as session:
        row = session.get(_UtcModel, "1")
        assert row is not None
        assert row.ts == original
        assert row.ts.tzinfo is not None


def test_migration_creates_table() -> None:
    import tempfile
    from pathlib import Path

    from app.infra.alembic import Alembic

    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test.sqlite"
        url = f"sqlite:///{db_path}"
        Alembic.for_database(url).upgrade("head")

        # Verify the table exists
        from sqlalchemy import create_engine, inspect

        engine = create_engine(url)
        inspector = inspect(engine)
        assert "repositories" in inspector.get_table_names()
        engine.dispose()
