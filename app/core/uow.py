from __future__ import annotations

from typing import Protocol

from app.core.repositories.ports import RepositoriesRepository


class UnitOfWork(Protocol):
    @property
    def repositories(self) -> RepositoriesRepository: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...

    def __enter__(self) -> UnitOfWork: ...

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: object,
    ) -> None: ...
