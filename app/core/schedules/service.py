from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime
from typing import Any

from app.core.errors import DoesNotExistError, WorkflowNotDispatchableError
from app.core.schedules.entities import (
    Schedule,
    next_run_at_for,
    validate_cron_expression,
)
from app.core.uow import UnitOfWork


def _next_run(schedule: Schedule) -> datetime | None:
    if not schedule.is_enabled:
        return None
    return next_run_at_for(schedule.cron_expression)


@dataclass(frozen=True)
class SchedulesService:
    uow: UnitOfWork

    def create_one(self, schedule: Schedule) -> Schedule:
        validate_cron_expression(schedule.cron_expression)
        with self.uow as uow:
            workflow = uow.workflows.read_one(schedule.workflow_id)
            if workflow is None:
                raise DoesNotExistError("Workflow", schedule.workflow_id)
            if workflow.state != "active" or not workflow.is_dispatchable:
                if not workflow.is_dispatchable:
                    reason = "workflow does not support workflow_dispatch"
                else:
                    reason = f"workflow state is {workflow.state!r}, expected 'active'"
                raise WorkflowNotDispatchableError(workflow.id, workflow.name, reason)
            stored = replace(
                schedule,
                last_run_at=None,
                next_run_at=_next_run(schedule),
            )
            return uow.schedules.create_one(stored)

    def update_one(self, schedule: Schedule) -> Schedule:
        validate_cron_expression(schedule.cron_expression)
        with self.uow as uow:
            existing = uow.schedules.read_one(schedule.id)
            if existing is None:
                raise DoesNotExistError("Schedule", schedule.id)
            stored = replace(
                schedule,
                id=existing.id,
                workflow_id=existing.workflow_id,
                last_run_at=existing.last_run_at,
                next_run_at=_next_run(schedule),
            )
            return uow.schedules.update_one(existing.id, stored)

    def read_many(
        self,
        limit: int | None = None,
        offset: int | None = None,
        sort_by: list[str] | None = None,
        **filters: Any,
    ) -> list[Schedule]:
        with self.uow as uow:
            return uow.schedules.read_many(
                limit=limit, offset=offset, sort_by=sort_by, **filters
            )

    def count(self, **filters: Any) -> int:
        with self.uow as uow:
            return uow.schedules.count(**filters)

    def read_one(self, id: str) -> Schedule:  # noqa: A002
        with self.uow as uow:
            entity = uow.schedules.read_one(id)
        if entity is None:
            raise DoesNotExistError("Schedule", id)
        return entity

    def delete_one(self, id: str) -> None:  # noqa: A002
        with self.uow as uow:
            existing = uow.schedules.read_one(id)
            if existing is None:
                raise DoesNotExistError("Schedule", id)
            logs = uow.logs.read_many(limit=None, schedule_id=id)
            for log in logs:
                uow.logs.update_one(log.id, replace(log, schedule_id=None))
            uow.schedules.delete_one(id)
