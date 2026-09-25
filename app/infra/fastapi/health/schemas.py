from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class SchedulerJobStatus(BaseModel):
    id: str
    next_run_time: datetime | None = None


class SchedulerStatus(BaseModel):
    is_running: bool
    jobs_count: int
    jobs: list[SchedulerJobStatus]


class RateLimiterStatus(BaseModel):
    rate_per_second: float
    capacity: float
    current_tokens: float


class HealthResponse(BaseModel):
    """Health check response schema."""

    status: str
    database: str = "connected"
    scheduler: SchedulerStatus | None = None
    rate_limiter: RateLimiterStatus | None = None
