from __future__ import annotations

from app.core.logs.entities import DispatchLog
from app.infra.fastapi.logs.schemas import DispatchLogResponse, DispatchTargetResponse


def map_dispatch_log(log: DispatchLog) -> DispatchLogResponse:
    target = None
    if log.target is not None:
        snapshot = log.target
        target = DispatchTargetResponse(
            repository_full_name=snapshot.repository_full_name,
            workflow_name=snapshot.workflow_name,
            workflow_path=snapshot.workflow_path,
            github_workflow_id=snapshot.github_workflow_id,
            resolved_ref=snapshot.resolved_ref,
            cron_expression=snapshot.cron_expression,
            repository_url=snapshot.repository_url,
            workflow_url=snapshot.workflow_url,
            ref=snapshot.ref,
            inputs=snapshot.inputs,
        )
    return DispatchLogResponse(
        id=log.id,
        schedule=None,
        target=target,
        triggered_at=log.triggered_at,
        status_code=log.status_code,
        run_url=log.run_url,
        response_payload=log.response_payload,
        error_message=log.error_message,
    )
