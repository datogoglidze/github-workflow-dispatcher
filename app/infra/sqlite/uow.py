from __future__ import annotations

import logging
from types import TracebackType

from sqlalchemy.orm import Session, sessionmaker

from app.core.logs.ports import DispatchLogsRepository
from app.core.repositories.ports import RepositoriesRepository
from app.core.workflows.ports import WorkflowsRepository
from app.infra.sqlite.log_repositories import DispatchLogsSqliteRepository
from app.infra.sqlite.repositories import RepositoriesSqliteRepository
from app.infra.sqlite.workflow_repositories import WorkflowsSqliteRepository

_logger = logging.getLogger(__name__)


class SqliteUnitOfWork:
    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory
        self._session: Session | None = None
        self._repositories: RepositoriesSqliteRepository | None = None
        self._workflows: WorkflowsSqliteRepository | None = None
        self._logs: DispatchLogsSqliteRepository | None = None

    @property
    def repositories(self) -> RepositoriesRepository:
        if self._repositories is None:
            raise RuntimeError("UnitOfWork is not active — use it as a context manager")
        return self._repositories

    @property
    def workflows(self) -> WorkflowsRepository:
        if self._workflows is None:
            raise RuntimeError("UnitOfWork is not active — use it as a context manager")
        return self._workflows

    @property
    def logs(self) -> DispatchLogsRepository:
        if self._logs is None:
            raise RuntimeError("UnitOfWork is not active — use it as a context manager")
        return self._logs

    def commit(self) -> None:
        if self._session is not None:
            self._session.commit()

    def rollback(self) -> None:
        if self._session is not None:
            self._session.rollback()

    def __enter__(self) -> SqliteUnitOfWork:
        if self._session is not None:
            raise RuntimeError("UnitOfWork is already active")
        self._session = self._session_factory()
        self._repositories = RepositoriesSqliteRepository(self._session)
        self._workflows = WorkflowsSqliteRepository(self._session)
        self._logs = DispatchLogsSqliteRepository(self._session)
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        session = self._session
        self._session = None
        self._repositories = None
        self._workflows = None
        self._logs = None

        if session is None:
            return

        try:
            if exc_type is not None:
                session.rollback()
            else:
                try:
                    session.commit()
                except Exception:
                    session.rollback()
                    raise
        finally:
            session.close()
