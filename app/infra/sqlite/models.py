from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

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

    __table_args__ = (
        Index("ix_repositories_full_name", "full_name"),
        Index("ix_repositories_github_repository_id", "github_repository_id"),
    )
