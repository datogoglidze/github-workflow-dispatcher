from __future__ import annotations

from dataclasses import dataclass, field
from uuid import uuid4


@dataclass(frozen=True)
class Workflow:
    repo_id: str
    github_workflow_id: int
    name: str
    path: str
    state: str = "active"
    is_dispatchable: bool = False
    sha: str | None = None
    url: str | None = None
    id: str = field(default_factory=lambda: str(uuid4()))
