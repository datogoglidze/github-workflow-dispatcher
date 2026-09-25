from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query, Request

from app.core.logs.entities import DispatchLog
from app.infra.fastapi.dependencies import (
    DispatchLogsServiceDependency,
    RepositoriesServiceDependency,
    SchedulesServiceDependency,
    WorkflowsServiceDependency,
)
from app.infra.fastapi.logs.mappers import map_dispatch_log
from app.infra.fastapi.logs.schemas import DispatchLogResponse, DispatchLogsResponse
from app.infra.fastapi.query import parse_query_filters
from app.infra.fastapi.response import ResourceFound
from app.infra.fastapi.schedules.mappers import embedded_schedules
from app.infra.fastapi.schedules.schemas import ScheduleResponse

router = APIRouter(tags=["logs"])


def _embedded(
    logs: list[DispatchLog],
    schedules_service: SchedulesServiceDependency,
    workflows_service: WorkflowsServiceDependency,
    repositories_service: RepositoriesServiceDependency,
) -> dict[str, ScheduleResponse]:
    return embedded_schedules(
        logs, schedules_service, workflows_service, repositories_service
    )


def _map_log(
    log: DispatchLog, schedule_map: dict[str, ScheduleResponse]
) -> DispatchLogResponse:
    schedule = schedule_map.get(log.schedule_id) if log.schedule_id else None
    return map_dispatch_log(log, schedule)


@router.get("/logs", response_model=None)
async def list_logs(
    request: Request,
    logs_service: DispatchLogsServiceDependency,
    schedules_service: SchedulesServiceDependency,
    workflows_service: WorkflowsServiceDependency,
    repositories_service: RepositoriesServiceDependency,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ResourceFound:
    parsed = parse_query_filters(request.query_params)
    sort_by = parsed.pop("sort_by", None) or ["-triggered_at"]
    parsed.pop("limit", None)
    parsed.pop("offset", None)

    logs = logs_service.read_many(limit=limit, offset=offset, sort_by=sort_by, **parsed)
    total = logs_service.count(**parsed)
    schedule_map = _embedded(
        logs, schedules_service, workflows_service, repositories_service
    )
    return ResourceFound(
        **DispatchLogsResponse(
            logs=[_map_log(log, schedule_map) for log in logs],
            count=len(logs),
            total=total,
            limit=limit,
            offset=offset,
        ).model_dump()
    )


@router.get("/logs/{log_id}", response_model=None)
async def get_log(
    log_id: str,
    logs_service: DispatchLogsServiceDependency,
    schedules_service: SchedulesServiceDependency,
    workflows_service: WorkflowsServiceDependency,
    repositories_service: RepositoriesServiceDependency,
) -> ResourceFound:
    log = logs_service.read_one(log_id)
    schedule_map = _embedded(
        [log], schedules_service, workflows_service, repositories_service
    )
    return ResourceFound(**{"log": _map_log(log, schedule_map).model_dump()})
