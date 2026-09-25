from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.core.errors import DoesNotExistError
from app.core.logs.entities import DispatchLog
from app.core.uow import UnitOfWork


@dataclass(frozen=True)
class DispatchLogsService:
    uow: UnitOfWork

    def read_many(
        self,
        limit: int | None = None,
        offset: int | None = None,
        sort_by: list[str] | None = None,
        **filters: Any,
    ) -> list[DispatchLog]:
        with self.uow as uow:
            return uow.logs.read_many(
                limit=limit, offset=offset, sort_by=sort_by, **filters
            )

    def count(self, **filters: Any) -> int:
        with self.uow as uow:
            return uow.logs.count(**filters)

    def read_one(self, id: str) -> DispatchLog:  # noqa: A002
        with self.uow as uow:
            entity = uow.logs.read_one(id)
        if entity is None:
            raise DoesNotExistError("DispatchLog", id)
        return entity
