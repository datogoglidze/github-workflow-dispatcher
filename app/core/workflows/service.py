from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.core.errors import DoesNotExistError
from app.core.uow import UnitOfWork
from app.core.workflows.entities import Workflow


@dataclass(frozen=True)
class WorkflowsService:
    uow: UnitOfWork

    def read_many(
        self,
        limit: int | None = None,
        offset: int | None = None,
        sort_by: list[str] | None = None,
        **filters: Any,
    ) -> list[Workflow]:
        with self.uow as uow:
            return uow.workflows.read_many(
                limit=limit, offset=offset, sort_by=sort_by, **filters
            )

    def count(self, **filters: Any) -> int:
        with self.uow as uow:
            return uow.workflows.count(**filters)

    def read_one(self, id: str) -> Workflow:  # noqa: A002
        with self.uow as uow:
            entity = uow.workflows.read_one(id)
        if entity is None:
            raise DoesNotExistError("Workflow", id)
        return entity
