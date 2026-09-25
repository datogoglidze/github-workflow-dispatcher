from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from apscheduler.triggers.cron import CronTrigger

from app.core.errors import InvalidCronExpressionError


@dataclass(frozen=True)
class Schedule:
    workflow_id: str
    cron_expression: str
    ref: str | None = None
    inputs: dict[str, Any] | None = None
    is_enabled: bool = True
    last_run_at: datetime | None = None
    next_run_at: datetime | None = None
    id: str = field(default_factory=lambda: str(uuid4()))

    def disabled(self) -> Schedule:
        return replace(self, is_enabled=False, next_run_at=None)


def validate_cron_expression(expr: str) -> None:
    """Raise InvalidCronExpressionError unless expr is a 5-field cron in UTC."""
    try:
        CronTrigger.from_crontab(expr, timezone=UTC)
    except (TypeError, ValueError) as exc:
        raise InvalidCronExpressionError(expr) from exc


def next_run_at_for(expr: str, *, now: datetime | None = None) -> datetime:
    validate_cron_expression(expr)
    trigger = CronTrigger.from_crontab(expr, timezone=UTC)
    moment = now or datetime.now(UTC)
    nxt = trigger.get_next_fire_time(None, moment)
    if nxt is None:
        raise InvalidCronExpressionError(expr)
    if nxt.tzinfo is None:
        return nxt.replace(tzinfo=UTC)
    return nxt.astimezone(UTC)
