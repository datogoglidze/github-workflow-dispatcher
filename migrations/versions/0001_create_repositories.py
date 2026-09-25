"""create repositories

Revision ID: 0001
Revises:
Create Date: 2025-01-01 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "repositories",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("github_repository_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("default_branch", sa.String(100), nullable=False, server_default="main"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("url", sa.String(2048), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("github_repository_id"),
    )
    op.create_index(
        "ix_repositories_full_name", "repositories", ["full_name"], unique=False
    )
    op.create_index(
        "ix_repositories_github_repository_id",
        "repositories",
        ["github_repository_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_repositories_github_repository_id", table_name="repositories")
    op.drop_index("ix_repositories_full_name", table_name="repositories")
    op.drop_table("repositories")
