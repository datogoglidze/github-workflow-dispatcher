from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request

from app.core.dispatcher.service import DispatcherService
from app.core.logs.service import DispatchLogsService
from app.core.repositories.service import RepositoriesService
from app.core.schedules.service import SchedulesService
from app.core.sync.service import SyncService
from app.core.workflows.service import WorkflowsService
from app.infra.scheduler.cron import apscheduler_cron


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
    service = request.app.state.sync_service
    if not isinstance(service, SyncService):
        raise RuntimeError("Sync service is not configured")
    return service


def get_dispatcher_service(request: Request) -> DispatcherService:
    """Provide the DispatcherService from app state."""
    service = request.app.state.dispatcher_service
    if not isinstance(service, DispatcherService):
        raise RuntimeError("Dispatcher service is not configured")
    return service


def get_schedules_service(request: Request) -> SchedulesService:
    """Provide a SchedulesService backed by the request's database."""
    database = request.app.state.database
    return SchedulesService(uow=database.uow(), cron=apscheduler_cron)


def get_logs_service(request: Request) -> DispatchLogsService:
    """Provide a DispatchLogsService backed by the request's database."""
    database = request.app.state.database
    return DispatchLogsService(uow=database.uow())


RepositoriesServiceDependency = Annotated[
    RepositoriesService, Depends(get_repositories_service)
]

WorkflowsServiceDependency = Annotated[WorkflowsService, Depends(get_workflows_service)]

SyncServiceDependency = Annotated[SyncService, Depends(get_sync_service)]

DispatcherServiceDependency = Annotated[
    DispatcherService, Depends(get_dispatcher_service)
]

DispatchLogsServiceDependency = Annotated[
    DispatchLogsService, Depends(get_logs_service)
]

SchedulesServiceDependency = Annotated[SchedulesService, Depends(get_schedules_service)]
