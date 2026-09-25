from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.workflows.entities import Workflow
from app.infra.sqlite.models import WorkflowModel
from app.infra.sqlite.repository import BaseSqliteRepository


class WorkflowsSqliteRepository(BaseSqliteRepository[WorkflowModel, Workflow]):
    def __init__(self, session: Session) -> None:
        super().__init__(session=session, model=WorkflowModel)

    def _serialize(self, entity: Workflow) -> WorkflowModel:
        return WorkflowModel(
            id=entity.id,
            repo_id=entity.repo_id,
            github_workflow_id=entity.github_workflow_id,
            name=entity.name,
            path=entity.path,
            state=entity.state,
            is_dispatchable=entity.is_dispatchable,
            sha=entity.sha,
            url=entity.url,
        )

    def _load(self, model: WorkflowModel) -> Workflow:
        return Workflow(
            id=model.id,
            repo_id=model.repo_id,
            github_workflow_id=model.github_workflow_id,
            name=model.name,
            path=model.path,
            state=model.state,
            is_dispatchable=model.is_dispatchable,
            sha=model.sha,
            url=model.url,
        )
