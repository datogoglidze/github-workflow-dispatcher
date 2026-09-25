from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.core.errors import DoesNotExistError
from app.core.repositories.entities import Repository
from app.core.uow import UnitOfWork


@dataclass(frozen=True)
class RepositoriesService:
    uow: UnitOfWork

    def read_many(
        self,
        limit: int | None = None,
        offset: int | None = None,
        **filters: Any,
    ) -> list[Repository]:
        with self.uow as uow:
            return uow.repositories.read_many(limit=limit, offset=offset, **filters)

    def count(self, **filters: Any) -> int:
        with self.uow as uow:
            return uow.repositories.count(**filters)

    def read_one(self, id: str) -> Repository:  # noqa: A002
        with self.uow as uow:
            entity = uow.repositories.read_one(id)
        if entity is None:
            raise DoesNotExistError("Repository", id)
        return entity
