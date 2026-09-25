from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query

from app.infra.fastapi.dependencies import RepositoriesServiceDependency
from app.infra.fastapi.repositories.mappers import map_repository
from app.infra.fastapi.repositories.schemas import (
    RepositoriesResponse,
)
from app.infra.fastapi.response import ResourceFound

router = APIRouter(prefix="/repositories", tags=["repositories"])


@router.get("", response_model=None)
async def list_repositories(
    service: RepositoriesServiceDependency,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ResourceFound:
    repositories = service.read_many(limit=limit, offset=offset)
    total = service.count()
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
