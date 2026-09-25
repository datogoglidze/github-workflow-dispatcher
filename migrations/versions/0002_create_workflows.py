"""create_workflows

Revision ID: 0002
Revises: 0001
Create Date: 2025-01-01 00:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workflows",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "repo_id",
            sa.String(36),
            sa.ForeignKey("repositories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("github_workflow_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("path", sa.String(2048), nullable=False),
        sa.Column("state", sa.String(50), nullable=False, server_default="active"),
        sa.Column("is_dispatchable", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("sha", sa.String(255), nullable=True),
        sa.Column("url", sa.String(2048), nullable=True),
    )
    op.create_index("ix_workflows_repo_id", "workflows", ["repo_id"])
    op.create_index("ix_workflows_github_workflow_id", "workflows", ["github_workflow_id"])


def downgrade() -> None:
    op.drop_index("ix_workflows_github_workflow_id", table_name="workflows")
    op.drop_index("ix_workflows_repo_id", table_name="workflows")
    op.drop_table("workflows")
