from __future__ import annotations

from typing import Any, Protocol

from app.core.workflows.entities import Workflow


class WorkflowsRepository(Protocol):
    def read_many(
        self,
        limit: int | None = None,
        offset: int | None = None,
        sort_by: list[str] | None = None,
        **filters: Any,
    ) -> list[Workflow]: ...

    def read_one(self, id: str) -> Workflow | None: ...  # noqa: A002

    def count(self, **filters: Any) -> int: ...

    def exists(self, **filters: Any) -> bool: ...

    def create_one(self, entity: Workflow) -> Workflow: ...

    def update_one(self, id: str, entity: Workflow) -> Workflow: ...  # noqa: A002

    def delete_one(self, id: str) -> None: ...  # noqa: A002
