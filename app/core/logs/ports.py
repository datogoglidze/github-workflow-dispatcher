from __future__ import annotations

from typing import Any, Protocol

from app.core.logs.entities import DispatchLog


class DispatchLogsRepository(Protocol):
    def read_many(
        self,
        limit: int | None = None,
        offset: int | None = None,
        sort_by: list[str] | None = None,
        **filters: Any,
    ) -> list[DispatchLog]: ...

    def read_one(self, id: str) -> DispatchLog | None: ...  # noqa: A002

    def count(self, **filters: Any) -> int: ...

    def exists(self, **filters: Any) -> bool: ...

    def create_one(self, entity: DispatchLog) -> DispatchLog: ...

    def update_one(self, id: str, entity: DispatchLog) -> DispatchLog: ...  # noqa: A002

    def delete_one(self, id: str) -> None: ...  # noqa: A002
