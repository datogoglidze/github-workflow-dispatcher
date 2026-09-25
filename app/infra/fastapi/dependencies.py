from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request

from app.core.repositories.service import RepositoriesService
from app.core.sync.service import SyncService
from app.core.workflows.service import WorkflowsService


def get_repositories_service(request: Request) -> RepositoriesService:
    """Provide a RepositoriesService backed by the request's database."""
    database = request.app.state.database
    return RepositoriesService(uow=database.uow())


def get_workflows_service(request: Request) -> WorkflowsService:
    """Provide a WorkflowsService backed by the request's database."""
    database = request.app.state.database
    return WorkflowsService(uow=database.uow())


def get_sync_service(request: Request) -> SyncService:
    """Provide the SyncService from app state."""
    return request.app.state.sync_service


RepositoriesServiceDependency = Annotated[
    RepositoriesService, Depends(get_repositories_service)
]

WorkflowsServiceDependency = Annotated[WorkflowsService, Depends(get_workflows_service)]

SyncServiceDependency = Annotated[SyncService, Depends(get_sync_service)]
