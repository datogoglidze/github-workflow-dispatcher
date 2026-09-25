from __future__ import annotations

from pydantic import BaseModel

from app.infra.fastapi.repositories.schemas import RepositoryResponse


class WorkflowResponse(BaseModel):
    id: str
    repo_id: str
    github_workflow_id: int
    name: str
    path: str
    state: str
    is_dispatchable: bool
    sha: str | None
    url: str | None
    repository: RepositoryResponse | None = None


class WorkflowsResponse(BaseModel):
    workflows: list[WorkflowResponse]
    count: int
    total: int
    limit: int
    offset: int


class SyncResponse(BaseModel):
    repositories_synced: int
    workflows_synced: int
    workflows_marked_deleted: int
