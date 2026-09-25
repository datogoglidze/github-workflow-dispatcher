from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query, Request

from app.infra.fastapi.dependencies import RepositoriesServiceDependency
from app.infra.fastapi.query import parse_query_filters
from app.infra.fastapi.repositories.mappers import map_repository
from app.infra.fastapi.repositories.schemas import (
    RepositoriesResponse,
)
from app.infra.fastapi.response import ResourceFound

router = APIRouter(prefix="/repositories", tags=["repositories"])


@router.get("", response_model=None)
async def list_repositories(
    request: Request,
    service: RepositoriesServiceDependency,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ResourceFound:
    parsed = parse_query_filters(request.query_params)
    sort_by = parsed.pop("sort_by", None)
    parsed.pop("limit", None)
    parsed.pop("offset", None)
    repositories = service.read_many(
        limit=limit, offset=offset, sort_by=sort_by, **parsed
    )
    total = service.count(**parsed)
    return ResourceFound(
        **RepositoriesResponse(
            repositories=[map_repository(r) for r in repositories],
            count=len(repositories),
            total=total,
            limit=limit,
            offset=offset,
        ).model_dump()
    )


@router.get("/{repo_id}", response_model=None)
async def get_repository(
    repo_id: str,
    service: RepositoriesServiceDependency,
) -> ResourceFound:
    repository = service.read_one(repo_id)
    return ResourceFound(**{"repository": map_repository(repository).model_dump()})
