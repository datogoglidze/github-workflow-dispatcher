from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from app.core.errors import DoesNotExistError, WorkflowNotDispatchableError
from app.core.logs.entities import DispatchLog, DispatchTarget
from app.plugins.github.client import GitHubClient

_ACCEPTED = "Workflow dispatch accepted by GitHub"


@dataclass
class DispatcherService:
    uow_factory: Callable[[], Any]
    github_client: GitHubClient

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
