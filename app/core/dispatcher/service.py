from __future__ import annotations

import asyncio
import random
from collections.abc import Callable
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from typing import Any

from app.core.errors import DoesNotExistError, WorkflowNotDispatchableError
from app.core.logs.entities import DispatchLog, DispatchTarget
from app.core.repositories.entities import Repository
from app.core.schedules.entities import Schedule, next_run_at_for
from app.core.workflows.entities import Workflow
from app.plugins.github.client import GitHubClient

_ACCEPTED = "Workflow dispatch accepted by GitHub"
_REMOVED = (
    "Workflow removed from repository on GitHub (HTTP 404). "
    "Schedule automatically disabled."
)
_NOT_DISPATCHABLE = (
    "Workflow is deleted or not dispatchable. Schedule automatically disabled."
)


@dataclass
class DispatcherService:
    uow_factory: Callable[[], Any]
    github_client: GitHubClient
    jitter_min_seconds: float = 1.0
    jitter_max_seconds: float = 15.0
    on_schedule_disabled: Callable[[str], None] | None = None

    async def trigger_workflow(
        self,
        workflow_id: str,
        *,
        ref: str | None = None,
        inputs: dict[str, Any] | None = None,
    ) -> DispatchLog:
        with self.uow_factory() as uow:
            workflow = uow.workflows.read_one(workflow_id)
            if workflow is None:
                raise DoesNotExistError("Workflow", workflow_id)
            if not workflow.is_dispatchable:
                raise WorkflowNotDispatchableError(
                    workflow_id,
                    workflow.name,
                    "workflow does not support workflow_dispatch",
                )
            if workflow.state != "active":
                raise WorkflowNotDispatchableError(
                    workflow_id,
                    workflow.name,
                    f"workflow state is {workflow.state!r}, expected 'active'",
                )
            repository = uow.repositories.read_one(workflow.repo_id)
            if repository is None:
                raise DoesNotExistError("Repository", workflow.repo_id)

            resolved_ref = (ref or repository.default_branch or "main").strip()
            owner, _, repo_name = repository.full_name.partition("/")
            github_workflow_id = workflow.github_workflow_id
            target = DispatchTarget(
                repository_full_name=repository.full_name,
                workflow_name=workflow.name,
                workflow_path=workflow.path,
                github_workflow_id=github_workflow_id,
                resolved_ref=resolved_ref,
                repository_url=repository.url,
                workflow_url=workflow.url,
                ref=ref,
                inputs=inputs,
            )

        try:
            result = await self.github_client.dispatch_workflow(
                owner,
                repo_name,
                github_workflow_id,
                resolved_ref,
                inputs,
            )
            status_code = result.status_code
            body = result.body
            run_url = result.run_url
        except Exception as exc:
            status_code = 500
            body = str(exc)
            run_url = None

        if status_code in (200, 204):
            log = DispatchLog(
                triggered_at=datetime.now(UTC),
                status_code=status_code,
                run_url=run_url,
                response_payload=_ACCEPTED,
                target=target,
            )
        else:
            log = DispatchLog(
                triggered_at=datetime.now(UTC),
                status_code=status_code,
                response_payload=body,
                error_message=f"GitHub dispatch failed with HTTP {status_code}: {body}",
                target=target,
            )

        with self.uow_factory() as uow:
            return uow.logs.create_one(log)

    async def dispatch(self, schedule_id: str, *, manual: bool = False) -> DispatchLog:
        if not manual:
            delay = random.uniform(self.jitter_min_seconds, self.jitter_max_seconds)
            await asyncio.sleep(delay)

        with self.uow_factory() as uow:
            schedule = uow.schedules.read_one(schedule_id)
            if schedule is None:
                raise DoesNotExistError("Schedule", schedule_id)
            workflow = uow.workflows.read_one(schedule.workflow_id)
            repository = (
                uow.repositories.read_one(workflow.repo_id)
                if workflow is not None
                else None
            )
            target = _target_snapshot(schedule, workflow, repository)
            if workflow is None or repository is None or not _is_dispatchable(workflow):
                current = uow.schedules.read_one(schedule_id)
                if current is not None:
                    uow.schedules.update_one(current.id, current.disabled())
                log = uow.logs.create_one(
                    DispatchLog(
                        triggered_at=datetime.now(UTC),
                        schedule_id=schedule_id,
                        status_code=400,
                        response_payload=_NOT_DISPATCHABLE,
                        error_message=_NOT_DISPATCHABLE,
                        target=target,
                    )
                )
            else:
                owner, _, repo_name = repository.full_name.partition("/")
                github_workflow_id = workflow.github_workflow_id
                resolved_ref = target.resolved_ref
                inputs = schedule.inputs
                workflow_id = workflow.id
                log = None

        if log is not None:
            self._notify_disabled(schedule_id)
            return log

        try:
            result = await self.github_client.dispatch_workflow(
                owner,
                repo_name,
                github_workflow_id,
                resolved_ref,
                inputs,
            )
            status_code = result.status_code
            body = result.body
            run_url = result.run_url
        except Exception as exc:
            status_code = 500
            body = str(exc)
            run_url = None

        now = datetime.now(UTC)
        with self.uow_factory() as uow:
            if status_code == 404:
                current_workflow = uow.workflows.read_one(workflow_id)
                if current_workflow is not None:
                    uow.workflows.update_one(
                        current_workflow.id,
                        replace(
                            current_workflow,
                            state="deleted",
                            is_dispatchable=False,
                        ),
                    )
                current = uow.schedules.read_one(schedule_id)
                if current is not None:
                    uow.schedules.update_one(current.id, current.disabled())
                saved = uow.logs.create_one(
                    DispatchLog(
                        triggered_at=now,
                        schedule_id=schedule_id,
                        status_code=404,
                        response_payload=body,
                        error_message=_REMOVED,
                        target=target,
                    )
                )
            elif status_code in (200, 204):
                saved = uow.logs.create_one(
                    DispatchLog(
                        triggered_at=now,
                        schedule_id=schedule_id,
                        status_code=status_code,
                        run_url=run_url,
                        response_payload=_ACCEPTED,
                        target=target,
                    )
                )
                _touch_schedule(uow, schedule_id, now)
            else:
                saved = uow.logs.create_one(
                    DispatchLog(
                        triggered_at=now,
                        schedule_id=schedule_id,
                        status_code=status_code,
                        response_payload=body,
                        error_message=(
                            f"GitHub dispatch failed with HTTP {status_code}: {body}"
                        ),
                        target=target,
                    )
                )
                _touch_schedule(uow, schedule_id, now)

        if status_code == 404:
            self._notify_disabled(schedule_id)
        return saved

    def _notify_disabled(self, schedule_id: str) -> None:
        if self.on_schedule_disabled is not None:
            self.on_schedule_disabled(schedule_id)


def _is_dispatchable(workflow: Workflow) -> bool:
    return workflow.state == "active" and workflow.is_dispatchable


def _target_snapshot(
    schedule: Schedule,
    workflow: Workflow | None,
    repository: Repository | None,
) -> DispatchTarget:
    default_branch = repository.default_branch if repository is not None else None
    resolved_ref = (schedule.ref or default_branch or "main").strip()
    return DispatchTarget(
        repository_full_name=repository.full_name if repository is not None else "",
        workflow_name=workflow.name if workflow is not None else "",
        workflow_path=workflow.path if workflow is not None else "",
        github_workflow_id=workflow.github_workflow_id if workflow is not None else 0,
        resolved_ref=resolved_ref,
        cron_expression=schedule.cron_expression,
        repository_url=repository.url if repository is not None else None,
        workflow_url=workflow.url if workflow is not None else None,
        ref=schedule.ref,
        inputs=schedule.inputs,
    )


def _touch_schedule(uow: Any, schedule_id: str, now: datetime) -> None:
    current = uow.schedules.read_one(schedule_id)
    if current is None:
        return
    next_run = next_run_at_for(current.cron_expression) if current.is_enabled else None
    uow.schedules.update_one(
        current.id,
        replace(current, last_run_at=now, next_run_at=next_run),
    )
