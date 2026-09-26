from __future__ import annotations

from datetime import datetime
from typing import Protocol


class CronExpressions(Protocol):
    """UTC cron validation and next-run calculation.

    Implementations live outside the domain layer so core does not depend on
    a particular scheduler library.
    """

    def validate_cron_expression(self, expr: str) -> None: ...

    def next_run_at_for(
        self, expr: str, *, now: datetime | None = None
    ) -> datetime: ...
