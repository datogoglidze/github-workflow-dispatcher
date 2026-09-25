from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.repositories.entities import Repository
from app.infra.sqlite.models import RepositoryModel
from app.infra.sqlite.repository import BaseSqliteRepository


class RepositoriesSqliteRepository(BaseSqliteRepository[RepositoryModel, Repository]):
    def __init__(self, session: Session) -> None:
        super().__init__(session=session, model=RepositoryModel)

    def _serialize(self, entity: Repository) -> RepositoryModel:
        return RepositoryModel(
            id=entity.id,
            github_repository_id=entity.github_repository_id,
            name=entity.name,
            full_name=entity.full_name,
            default_branch=entity.default_branch,
            is_active=entity.is_active,
            last_synced_at=entity.last_synced_at,
            url=entity.url,
        )

    def _load(self, model: RepositoryModel) -> Repository:
        return Repository(
            id=model.id,
            github_repository_id=model.github_repository_id,
            name=model.name,
            full_name=model.full_name,
            default_branch=model.default_branch,
            is_active=model.is_active,
            last_synced_at=model.last_synced_at,
            url=model.url,
        )
