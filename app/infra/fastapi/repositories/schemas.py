from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class RepositoryResponse(BaseModel):
    id: str
    github_repository_id: int | None
    name: str
    full_name: str
    default_branch: str
    is_active: bool
    last_synced_at: datetime | None
    url: str | None


class RepositoriesResponse(BaseModel):
    repositories: list[RepositoryResponse]
    count: int
    total: int
    limit: int
    offset: int


class RepositoryEnvelope(BaseModel):
    repository: RepositoryResponse
