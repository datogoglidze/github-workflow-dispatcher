from __future__ import annotations

from typing import Any, Protocol

from app.core.schedules.entities import Schedule


class SchedulesRepository(Protocol):
    def read_many(
        self,
        limit: int | None = None,
        offset: int | None = None,
        sort_by: list[str] | None = None,
        **filters: Any,
    ) -> list[Schedule]: ...

    def read_one(self, id: str) -> Schedule | None: ...  # noqa: A002

    def count(self, **filters: Any) -> int: ...

    def exists(self, **filters: Any) -> bool: ...

    def create_one(self, entity: Schedule) -> Schedule: ...

    def update_one(self, id: str, entity: Schedule) -> Schedule: ...  # noqa: A002

    def delete_one(self, id: str) -> None: ...  # noqa: A002
