from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query, Request

from app.infra.fastapi.dependencies import DispatchLogsServiceDependency
from app.infra.fastapi.logs.mappers import map_dispatch_log
from app.infra.fastapi.logs.schemas import DispatchLogsResponse
from app.infra.fastapi.query import parse_query_filters
from app.infra.fastapi.response import ResourceFound

router = APIRouter(tags=["logs"])


@router.get("/logs", response_model=None)
async def list_logs(
    request: Request,
    logs_service: DispatchLogsServiceDependency,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ResourceFound:
    parsed = parse_query_filters(request.query_params)
    sort_by = parsed.pop("sort_by", None) or ["-triggered_at"]
    parsed.pop("limit", None)
    parsed.pop("offset", None)

    logs = logs_service.read_many(limit=limit, offset=offset, sort_by=sort_by, **parsed)
    total = logs_service.count(**parsed)
    return ResourceFound(
        **DispatchLogsResponse(
            logs=[map_dispatch_log(log) for log in logs],
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
) -> ResourceFound:
    log = logs_service.read_one(log_id)
    return ResourceFound(**{"log": map_dispatch_log(log).model_dump()})
