from __future__ import annotations

from app.core.repositories.entities import Repository
from app.infra.fastapi.repositories.schemas import RepositoryResponse


def map_repository(entity: Repository) -> RepositoryResponse:
    return RepositoryResponse(
        id=entity.id,
        github_repository_id=entity.github_repository_id,
        name=entity.name,
        full_name=entity.full_name,
        default_branch=entity.default_branch,
        is_active=entity.is_active,
        last_synced_at=entity.last_synced_at,
        url=entity.url,
    )
