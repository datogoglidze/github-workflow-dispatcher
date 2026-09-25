from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.infra.fastapi.workflows.schemas import WorkflowResponse


class ScheduleCreateRequest(BaseModel):
    workflow_id: str
    cron_expression: str
    ref: str | None = None
    inputs: dict[str, Any] | None = None
    is_enabled: bool = True


class ScheduleUpdateRequest(BaseModel):
    cron_expression: str | None = None
    ref: str | None = None
    inputs: dict[str, Any] | None = None
    is_enabled: bool | None = None


class ScheduleResponse(BaseModel):
    id: str
    workflow_id: str
    cron_expression: str
    ref: str | None = None
    inputs: dict[str, Any] | None = None
    is_enabled: bool
    last_run_at: datetime | None = None
    next_run_at: datetime | None = None
    workflow: WorkflowResponse


class SchedulesResponse(BaseModel):
    schedules: list[ScheduleResponse]
    count: int
    total: int
    limit: int
    offset: int
