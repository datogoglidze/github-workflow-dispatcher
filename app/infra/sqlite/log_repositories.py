from __future__ import annotations

from typing import Any

from sqlalchemy import Integer
from sqlalchemy.orm import Session

from app.core.logs.entities import DispatchLog, DispatchTarget
from app.infra.sqlite.models import DispatchLogModel
from app.infra.sqlite.repository import BaseSqliteRepository


class DispatchLogsSqliteRepository(BaseSqliteRepository[DispatchLogModel, DispatchLog]):
    def __init__(self, session: Session) -> None:
        super().__init__(session=session, model=DispatchLogModel)

    def _coerce_value(self, column: Any, value: Any) -> Any:
        value = super()._coerce_value(column, value)
        if isinstance(value, list):
            return [self._coerce_int(column, item) for item in value]
        return self._coerce_int(column, value)

    def _coerce_int(self, column: Any, value: Any) -> Any:
        try:
            col_type = column.property.columns[0].type
        except Exception:
            return value
        if isinstance(col_type, Integer) and isinstance(value, str):
            try:
                return int(value)
            except ValueError:
                return value
        return value

    def _serialize(self, entity: DispatchLog) -> DispatchLogModel:
        target = entity.target
        return DispatchLogModel(
            id=entity.id,
            schedule_id=entity.schedule_id,
            triggered_at=entity.triggered_at,
            status_code=entity.status_code,
            run_url=entity.run_url,
            response_payload=entity.response_payload,
            error_message=entity.error_message,
            repository_full_name=target.repository_full_name if target else None,
            repository_url=target.repository_url if target else None,
            workflow_name=target.workflow_name if target else None,
            workflow_path=target.workflow_path if target else None,
            workflow_url=target.workflow_url if target else None,
            github_workflow_id=target.github_workflow_id if target else None,
            cron_expression=target.cron_expression if target else None,
            ref=target.ref if target else None,
            resolved_ref=target.resolved_ref if target else None,
            inputs=target.inputs if target else None,
        )

    def _load(self, model: DispatchLogModel) -> DispatchLog:
        return DispatchLog(
            id=model.id,
            triggered_at=model.triggered_at,
            schedule_id=model.schedule_id,
            status_code=model.status_code,
            run_url=model.run_url,
            response_payload=model.response_payload,
            error_message=model.error_message,
            target=self._load_target(model),
        )

    def _load_target(self, model: DispatchLogModel) -> DispatchTarget | None:
        full_name = model.repository_full_name
        name = model.workflow_name
        path = model.workflow_path
        github_workflow_id = model.github_workflow_id
        resolved_ref = model.resolved_ref
        if (
            full_name is None
            or name is None
            or path is None
            or github_workflow_id is None
            or resolved_ref is None
        ):
            return None
        return DispatchTarget(
            repository_full_name=full_name,
            workflow_name=name,
            workflow_path=path,
            github_workflow_id=github_workflow_id,
            resolved_ref=resolved_ref,
            cron_expression=model.cron_expression,
            repository_url=model.repository_url,
            workflow_url=model.workflow_url,
            ref=model.ref,
            inputs=model.inputs,
        )
