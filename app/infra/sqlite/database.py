from __future__ import annotations

from dataclasses import dataclass
from typing import Any, cast

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.infra.sqlite.uow import SqliteUnitOfWork

_IN_MEMORY_URLS = {"", "sqlite://", "sqlite:///:memory:"}


@dataclass(frozen=True)
class Sqlite:
    database_url: str

    def __post_init__(self) -> None:
        connect_args: dict[str, Any] = {"check_same_thread": False}
        kwargs: dict[str, Any] = {"connect_args": connect_args}

        if self.is_in_memory:
            kwargs["poolclass"] = StaticPool

        engine = create_engine(self.database_url, **kwargs)

        @event.listens_for(engine, "connect")
        def set_pragmas(dbapi_conn: Any, _connection_record: Any) -> None:
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA busy_timeout=30000")
            if not self.is_in_memory:
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.close()

        factory: sessionmaker[Session] = sessionmaker(
            bind=engine, expire_on_commit=False
        )

        # frozen dataclass — bypass __setattr__ to store computed fields.
        # Use distinct slot names to avoid collision with property names.
        object.__setattr__(self, "_engine_instance", engine)
        object.__setattr__(self, "_factory_instance", factory)

    @property
    def is_in_memory(self) -> bool:
        return self.database_url.strip() in _IN_MEMORY_URLS

    @property
    def engine(self) -> Engine:
        return cast(Engine, object.__getattribute__(self, "_engine_instance"))

    @property
    def _session_factory(self) -> sessionmaker[Session]:
        return cast(
            sessionmaker[Session],
            object.__getattribute__(self, "_factory_instance"),
        )

    def uow(self) -> SqliteUnitOfWork:
        return SqliteUnitOfWork(session_factory=self._session_factory)

    def dispose(self) -> None:
        self.engine.dispose()
