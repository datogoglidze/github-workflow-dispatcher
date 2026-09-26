from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import datetime
from typing import Any
from uuid import uuid4


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
