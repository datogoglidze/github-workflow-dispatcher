from __future__ import annotations

from typing import Any, Protocol

from app.core.repositories.entities import Repository


class RepositoriesRepository(Protocol):
    def read_many(
        self,
        limit: int | None = None,
        offset: int | None = None,
        **filters: Any,
    ) -> list[Repository]: ...

    def read_one(self, id: str) -> Repository | None: ...  # noqa: A002

    def count(self, **filters: Any) -> int: ...

    def exists(self, **filters: Any) -> bool: ...

    def create_one(self, entity: Repository) -> Repository: ...

    def update_one(self, id: str, entity: Repository) -> Repository: ...  # noqa: A002

    def delete_one(self, id: str) -> None: ...  # noqa: A002
