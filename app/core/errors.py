from __future__ import annotations

from dataclasses import dataclass


@dataclass
class DoesNotExistError(Exception):
    entity: str
    id: str

    def __str__(self) -> str:
        return f"{self.entity} with id '{self.id}' not found"


@dataclass
class ExistsError(Exception):
    entity: str
    field: str
    value: str

    def __str__(self) -> str:
        return f"{self.entity} with {self.field} '{self.value}' already exists"


@dataclass
class GitHubApiError(Exception):
    status_code: int
    message: str

    def __str__(self) -> str:
        return f"GitHub API error {self.status_code}: {self.message}"


@dataclass
class RateLimitExceededError(Exception):
    retry_after: float

    def __str__(self) -> str:
        return f"Rate limit exceeded; retry after {self.retry_after}s"


@dataclass
class GitHubNotConfiguredError(Exception):
    missing: list[str]

    def __str__(self) -> str:
        return f"GitHub not configured — missing: {', '.join(self.missing)}"


@dataclass
class InvalidCronExpressionError(Exception):
    expression: str

    def __str__(self) -> str:
        return f"Invalid cron expression: '{self.expression}'"


@dataclass
class WorkflowNotDispatchableError(Exception):
    workflow_id: str
    name: str
    reason: str

    def __str__(self) -> str:
        return (
            f"Workflow '{self.name}' ({self.workflow_id}) cannot be dispatched: "
            f"{self.reason}"
        )
