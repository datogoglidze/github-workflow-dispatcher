from __future__ import annotations

import contextlib
from typing import Annotated, Any

from fastapi import APIRouter, Query, Request

from app.core.errors import DoesNotExistError
from app.infra.fastapi.dependencies import (
    RepositoriesServiceDependency,
    SyncServiceDependency,
    WorkflowsServiceDependency,
)
from app.infra.fastapi.query import parse_query_filters
from app.infra.fastapi.repositories.mappers import map_repository
from app.infra.fastapi.response import ResourceFound
from app.infra.fastapi.workflows.schemas import (
    SyncResponse,
    WorkflowResponse,
    WorkflowsResponse,
)

router = APIRouter(tags=["workflows"])


@router.post("/repositories/sync", response_model=None)
async def sync_repositories(
    sync_service: SyncServiceDependency,
) -> ResourceFound:
    result = await sync_service.sync_all()
    return ResourceFound(
        **SyncResponse(
            repositories_synced=result.repositories_synced,
            workflows_synced=result.workflows_synced,
            workflows_marked_deleted=result.workflows_marked_deleted,
        ).model_dump()
    )


def _build_workflow_response(
    workflow: Any, repo_map: dict[str, Any]
) -> WorkflowResponse:
    repo = repo_map.get(workflow.repo_id)
    return WorkflowResponse(
        id=workflow.id,
        repo_id=workflow.repo_id,
        github_workflow_id=workflow.github_workflow_id,
        name=workflow.name,
        path=workflow.path,
        state=workflow.state,
        is_dispatchable=workflow.is_dispatchable,
        sha=workflow.sha,
        url=workflow.url,
        repository=map_repository(repo) if repo is not None else None,
    )


@router.get("/workflows", response_model=None)
async def list_workflows(
    request: Request,
    workflows_service: WorkflowsServiceDependency,
    repositories_service: RepositoriesServiceDependency,
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ResourceFound:
    parsed = parse_query_filters(request.query_params)
    sort_by = parsed.pop("sort_by", None)
    parsed.pop("limit", None)
    parsed.pop("offset", None)

    workflows = workflows_service.read_many(
        limit=limit, offset=offset, sort_by=sort_by, **parsed
    )
    total = workflows_service.count(**parsed)

    # Batch-load repositories
    repo_ids = {w.repo_id for w in workflows}
    repos = repositories_service.read_many(limit=None) if repo_ids else []
    repo_map = {r.id: r for r in repos}

    return ResourceFound(
        **WorkflowsResponse(
            workflows=[_build_workflow_response(w, repo_map) for w in workflows],
            count=len(workflows),
            total=total,
            limit=limit,
            offset=offset,
        ).model_dump()
    )


@router.get("/workflows/{workflow_id}", response_model=None)
async def get_workflow(
    workflow_id: str,
    workflows_service: WorkflowsServiceDependency,
    repositories_service: RepositoriesServiceDependency,
) -> ResourceFound:
    workflow = workflows_service.read_one(workflow_id)
    repo = None
    with contextlib.suppress(DoesNotExistError):
        repo = repositories_service.read_one(workflow.repo_id)
    repo_map = {repo.id: repo} if repo else {}
    return ResourceFound(
        **{"workflow": _build_workflow_response(workflow, repo_map).model_dump()}
    )
