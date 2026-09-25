from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from uuid import uuid4


@dataclass(frozen=True)
class Repository:
    name: str
    full_name: str
    default_branch: str
    github_repository_id: int | None = None
    is_active: bool = True
    last_synced_at: datetime | None = None
    url: str | None = None
    id: str = field(default_factory=lambda: str(uuid4()))
