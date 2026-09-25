from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.infra.fastapi.schedules.schemas import ScheduleResponse


class DispatchTargetResponse(BaseModel):
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


class DispatchLogResponse(BaseModel):
    id: str
    schedule_id: str | None = None
    schedule: ScheduleResponse | None = None
    target: DispatchTargetResponse | None = None
    triggered_at: datetime
    status_code: int | None = None
    run_url: str | None = None
    response_payload: str | None = None
    error_message: str | None = None


class DispatchLogsResponse(BaseModel):
    logs: list[DispatchLogResponse]
    count: int
    total: int
    limit: int
    offset: int
