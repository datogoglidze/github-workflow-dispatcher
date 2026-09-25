from __future__ import annotations

from app.core.logs.entities import DispatchLog
from app.core.repositories.entities import Repository
from app.core.repositories.service import RepositoriesService
from app.core.schedules.entities import Schedule
from app.core.schedules.service import SchedulesService
from app.core.workflows.entities import Workflow
from app.core.workflows.service import WorkflowsService
from app.infra.fastapi.repositories.mappers import map_repository
from app.infra.fastapi.schedules.schemas import ScheduleResponse
from app.infra.fastapi.workflows.schemas import WorkflowResponse


def map_schedule(
    schedule: Schedule,
    workflow: Workflow,
    repository: Repository | None,
) -> ScheduleResponse:
    return ScheduleResponse(
        id=schedule.id,
        workflow_id=schedule.workflow_id,
        cron_expression=schedule.cron_expression,
        ref=schedule.ref,
        inputs=schedule.inputs,
        is_enabled=schedule.is_enabled,
        last_run_at=schedule.last_run_at,
        next_run_at=schedule.next_run_at,
        workflow=WorkflowResponse(
            id=workflow.id,
            repo_id=workflow.repo_id,
            github_workflow_id=workflow.github_workflow_id,
            name=workflow.name,
            path=workflow.path,
            state=workflow.state,
            is_dispatchable=workflow.is_dispatchable,
            sha=workflow.sha,
            url=workflow.url,
            repository=map_repository(repository) if repository is not None else None,
        ),
    )


def map_schedules(
    schedules: list[Schedule],
    workflows_service: WorkflowsService,
    repositories_service: RepositoriesService,
) -> dict[str, ScheduleResponse]:
    if not schedules:
        return {}
    workflow_ids = list({schedule.workflow_id for schedule in schedules})
    workflows = workflows_service.read_many(limit=None, id__in=workflow_ids)
    workflows_by_id = {workflow.id: workflow for workflow in workflows}
    repo_ids = list({workflow.repo_id for workflow in workflows})
    repositories = (
        repositories_service.read_many(limit=None, id__in=repo_ids) if repo_ids else []
    )
    repositories_by_id = {repository.id: repository for repository in repositories}
    mapped: dict[str, ScheduleResponse] = {}
    for schedule in schedules:
        workflow = workflows_by_id.get(schedule.workflow_id)
        if workflow is None:
            continue
        mapped[schedule.id] = map_schedule(
            schedule,
            workflow,
            repositories_by_id.get(workflow.repo_id),
        )
    return mapped


def embedded_schedules(
    logs: list[DispatchLog],
    schedules_service: SchedulesService,
    workflows_service: WorkflowsService,
    repositories_service: RepositoriesService,
) -> dict[str, ScheduleResponse]:
    schedule_ids = list({log.schedule_id for log in logs if log.schedule_id})
    if not schedule_ids:
        return {}
    schedules = schedules_service.read_many(limit=None, id__in=schedule_ids)
    return map_schedules(schedules, workflows_service, repositories_service)
