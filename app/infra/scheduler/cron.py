from __future__ import annotations

from datetime import UTC, datetime

from apscheduler.triggers.cron import CronTrigger

from app.core.errors import InvalidCronExpressionError


class ApschedulerCron:
    """5-field cron evaluation in UTC, backed by APScheduler."""

    def validate_cron_expression(self, expr: str) -> None:
        """Raise InvalidCronExpressionError unless expr is a 5-field cron in UTC."""
        try:
            CronTrigger.from_crontab(expr, timezone=UTC)
        except (TypeError, ValueError) as exc:
            raise InvalidCronExpressionError(expr) from exc

    def next_run_at_for(self, expr: str, *, now: datetime | None = None) -> datetime:
        self.validate_cron_expression(expr)
        trigger = CronTrigger.from_crontab(expr, timezone=UTC)
        moment = now or datetime.now(UTC)
        fired = trigger.get_next_fire_time(None, moment)
        if not isinstance(fired, datetime):
            raise InvalidCronExpressionError(expr)
        if fired.tzinfo is None:
            return fired.replace(tzinfo=UTC)
        return fired.astimezone(UTC)


apscheduler_cron = ApschedulerCron()
