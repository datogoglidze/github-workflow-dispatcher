from __future__ import annotations

from fastapi import APIRouter, Request

from app.infra.fastapi.health.schemas import (
    HealthResponse,
    RateLimiterStatus,
    SchedulerStatus,
)

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    scheduler_service = getattr(request.app.state, "scheduler_service", None)
    rate_limiter = getattr(request.app.state, "rate_limiter", None)
    scheduler = None
    if scheduler_service is not None:
        scheduler = SchedulerStatus.model_validate(scheduler_service.get_status())
    limiter = None
    if rate_limiter is not None:
        limiter = RateLimiterStatus(
            rate_per_second=rate_limiter.rate_per_second,
            capacity=rate_limiter.capacity,
            current_tokens=rate_limiter.current_tokens,
        )
    return HealthResponse(status="healthy", scheduler=scheduler, rate_limiter=limiter)
