from __future__ import annotations

from typing import Protocol

from app.core.logs.ports import DispatchLogsRepository
from app.core.repositories.ports import RepositoriesRepository
from app.core.workflows.ports import WorkflowsRepository


class UnitOfWork(Protocol):
    @property
    def repositories(self) -> RepositoriesRepository: ...

    @property
    def workflows(self) -> WorkflowsRepository: ...

    @property
    def logs(self) -> DispatchLogsRepository: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...

    def __enter__(self) -> UnitOfWork: ...

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: object,
    ) -> None: ...
