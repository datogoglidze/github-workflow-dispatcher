from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String
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
