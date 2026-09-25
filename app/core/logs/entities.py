from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import uuid4


@dataclass(frozen=True)
class DispatchTarget:
    """Snapshot of the workflow taken at dispatch time. Never updated later."""

    repository_full_name: str
    workflow_name: str
    workflow_path: str
    github_workflow_id: int
    resolved_ref: str
    cron_expression: str | None = None
    repository_url: str | None = None
    workflow_url: str | None = None
    ref: str | None = None
    inputs: dict[str, Any] | None = None


@dataclass(frozen=True)
class DispatchLog:
    triggered_at: datetime
    schedule_id: str | None = None
    status_code: int | None = None
    run_url: str | None = None
    response_payload: str | None = None
    error_message: str | None = None
    target: DispatchTarget | None = None
    id: str = field(default_factory=lambda: str(uuid4()))
