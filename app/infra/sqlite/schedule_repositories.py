from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.schedules.entities import Schedule
from app.infra.sqlite.models import ScheduleModel
from app.infra.sqlite.repository import BaseSqliteRepository


class SchedulesSqliteRepository(BaseSqliteRepository[ScheduleModel, Schedule]):
    def __init__(self, session: Session) -> None:
        super().__init__(session=session, model=ScheduleModel)

    def _serialize(self, entity: Schedule) -> ScheduleModel:
        return ScheduleModel(
            id=entity.id,
            workflow_id=entity.workflow_id,
            cron_expression=entity.cron_expression,
            ref=entity.ref,
            inputs=entity.inputs,
            is_enabled=entity.is_enabled,
            last_run_at=entity.last_run_at,
            next_run_at=entity.next_run_at,
        )

    def _load(self, model: ScheduleModel) -> Schedule:
        return Schedule(
            id=model.id,
            workflow_id=model.workflow_id,
            cron_expression=model.cron_expression,
            ref=model.ref,
            inputs=model.inputs,
            is_enabled=model.is_enabled,
            last_run_at=model.last_run_at,
            next_run_at=model.next_run_at,
        )
