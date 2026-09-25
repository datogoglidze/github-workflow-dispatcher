from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Query, Request
from starlette.responses import Response

from app.core.schedules.entities import Schedule
from app.infra.fastapi.dependencies import (
    DispatcherServiceDependency,
    RepositoriesServiceDependency,
    SchedulesServiceDependency,
    WorkflowsServiceDependency,
)
from app.infra.fastapi.logs.mappers import map_dispatch_log
from app.infra.fastapi.query import parse_query_filters
from app.infra.fastapi.response import ResourceCreated, ResourceFound
from app.infra.fastapi.schedules.mappers import embedded_schedules, map_schedules
from app.infra.fastapi.schedules.schemas import (
    ScheduleCreateRequest,
    SchedulesResponse,
    ScheduleUpdateRequest,
)
from app.infra.scheduler.service import SchedulerService

router = APIRouter(tags=["schedules"])


def _scheduler(request: Request) -> SchedulerService | None:
    scheduler: SchedulerService | None = getattr(
        request.app.state, "scheduler_service", None
    )
    return scheduler


def _dump_schedule(
    schedule: Schedule,
    workflows_service: WorkflowsServiceDependency,
    repositories_service: RepositoriesServiceDependency,
) -> dict[str, Any]:
    mapped = map_schedules([schedule], workflows_service, repositories_service)
    return mapped[schedule.id].model_dump()


@router.post("/schedules", status_code=201, response_model=None)
async def create_schedule(
    request: Request,
    body: ScheduleCreateRequest,
    schedules_service: SchedulesServiceDependency,
    workflows_service: WorkflowsServiceDependency,
    repositories_service: RepositoriesServiceDependency,
) -> ResourceCreated:
    created = schedules_service.create_one(
        Schedule(
            workflow_id=body.workflow_id,
            cron_expression=body.cron_expression,
            ref=body.ref,
            inputs=body.inputs,
            is_enabled=body.is_enabled,
        )
    )
    scheduler = _scheduler(request)
    if scheduler is not None:
        scheduler.add_or_update_schedule_job(created)
    return ResourceCreated(
        schedule=_dump_schedule(created, workflows_service, repositories_service)
    )


@router.get("/schedules", response_model=None)
async def list_schedules(
    request: Request,
    schedules_service: SchedulesServiceDependency,
    workflows_service: WorkflowsServiceDependency,
    repositories_service: RepositoriesServiceDependency,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ResourceFound:
    parsed = parse_query_filters(request.query_params)
    sort_by = parsed.pop("sort_by", None)
    parsed.pop("limit", None)
    parsed.pop("offset", None)
    schedules = schedules_service.read_many(
        limit=limit, offset=offset, sort_by=sort_by, **parsed
    )
    total = schedules_service.count(**parsed)
    mapped = map_schedules(schedules, workflows_service, repositories_service)
    return ResourceFound(
        **SchedulesResponse(
            schedules=[
                mapped[schedule.id] for schedule in schedules if schedule.id in mapped
            ],
            count=len(schedules),
            total=total,
            limit=limit,
            offset=offset,
        ).model_dump()
    )


@router.get("/schedules/{schedule_id}", response_model=None)
async def get_schedule(
    schedule_id: str,
    schedules_service: SchedulesServiceDependency,
    workflows_service: WorkflowsServiceDependency,
    repositories_service: RepositoriesServiceDependency,
) -> ResourceFound:
    schedule = schedules_service.read_one(schedule_id)
    return ResourceFound(
        schedule=_dump_schedule(schedule, workflows_service, repositories_service)
    )


@router.patch("/schedules/{schedule_id}", response_model=None)
async def update_schedule(
    request: Request,
    schedule_id: str,
    body: ScheduleUpdateRequest,
    schedules_service: SchedulesServiceDependency,
    workflows_service: WorkflowsServiceDependency,
    repositories_service: RepositoriesServiceDependency,
) -> ResourceFound:
    existing = schedules_service.read_one(schedule_id)
    changes = body.model_dump(exclude_unset=True)
    updated = schedules_service.update_one(
        Schedule(
            id=existing.id,
            workflow_id=existing.workflow_id,
            cron_expression=changes.get("cron_expression", existing.cron_expression),
            ref=changes.get("ref", existing.ref),
            inputs=changes.get("inputs", existing.inputs),
            is_enabled=changes.get("is_enabled", existing.is_enabled),
            last_run_at=existing.last_run_at,
            next_run_at=existing.next_run_at,
        )
    )
    scheduler = _scheduler(request)
    if scheduler is not None:
        scheduler.add_or_update_schedule_job(updated)
    return ResourceFound(
        schedule=_dump_schedule(updated, workflows_service, repositories_service)
    )


@router.delete("/schedules/{schedule_id}", status_code=204, response_model=None)
async def delete_schedule(
    request: Request,
    schedule_id: str,
    schedules_service: SchedulesServiceDependency,
) -> Response:
    schedules_service.delete_one(schedule_id)
    scheduler = _scheduler(request)
    if scheduler is not None:
        scheduler.remove_schedule_job(schedule_id)
    return Response(status_code=204)


@router.post("/schedules/{schedule_id}/trigger", response_model=None)
async def trigger_schedule(
    schedule_id: str,
    dispatcher: DispatcherServiceDependency,
    schedules_service: SchedulesServiceDependency,
    workflows_service: WorkflowsServiceDependency,
    repositories_service: RepositoriesServiceDependency,
) -> ResourceFound:
    log = await dispatcher.dispatch(schedule_id, manual=True)
    schedule_map = embedded_schedules(
        [log], schedules_service, workflows_service, repositories_service
    )
    embedded = schedule_map.get(log.schedule_id) if log.schedule_id else None
    return ResourceFound(**{"log": map_dispatch_log(log, embedded).model_dump()})
