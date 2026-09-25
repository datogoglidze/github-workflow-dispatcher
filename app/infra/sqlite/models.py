from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infra.sqlite import Base
from app.infra.sqlite.types import UtcDateTime


class RepositoryModel(Base):
    __tablename__ = "repositories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    github_repository_id: Mapped[int | None] = mapped_column(
        Integer, unique=True, nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    default_branch: Mapped[str] = mapped_column(
        String(100), nullable=False, default="main"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    workflows: Mapped[list[WorkflowModel]] = relationship(
        "WorkflowModel", back_populates="repository", lazy="select"
    )

    __table_args__ = (
        Index("ix_repositories_full_name", "full_name"),
        Index("ix_repositories_github_repository_id", "github_repository_id"),
    )


class WorkflowModel(Base):
    __tablename__ = "workflows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    repo_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
    )
    github_workflow_id: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    path: Mapped[str] = mapped_column(String(2048), nullable=False)
    state: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    is_dispatchable: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    sha: Mapped[str | None] = mapped_column(String(255), nullable=True)
    url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    repository: Mapped[RepositoryModel] = relationship(
        "RepositoryModel",
        back_populates="workflows",
        lazy="select",
        info={"filterable": True},
    )

    __table_args__ = (
        Index("ix_workflows_repo_id", "repo_id"),
        Index("ix_workflows_github_workflow_id", "github_workflow_id"),
    )


class DispatchLogModel(Base):
    __tablename__ = "dispatch_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    schedule_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    triggered_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    run_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    response_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    repository_full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    repository_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    workflow_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    workflow_path: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    workflow_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    github_workflow_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cron_expression: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    resolved_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    inputs: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    __table_args__ = (
        Index("ix_dispatch_logs_schedule_id", "schedule_id"),
        Index("ix_dispatch_logs_triggered_at", "triggered_at"),
    )


class ScheduleModel(Base):
    __tablename__ = "schedules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workflow_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=False,
    )
    cron_expression: Mapped[str] = mapped_column(String(255), nullable=False)
    ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    inputs: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_run_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    next_run_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)

    workflow: Mapped[WorkflowModel] = relationship(
        "WorkflowModel",
        lazy="select",
        info={"filterable": True},
    )

    __table_args__ = (
        Index("ix_schedules_workflow_id", "workflow_id"),
        Index("ix_schedules_next_run_at", "next_run_at"),
    )
