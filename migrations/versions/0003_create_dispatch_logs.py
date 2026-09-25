"""create_dispatch_logs

Revision ID: 0003
Revises: 0002
Create Date: 2025-01-01 00:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "dispatch_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("schedule_id", sa.String(36), nullable=True),
        sa.Column("triggered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("run_url", sa.String(2048), nullable=True),
        sa.Column("response_payload", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("repository_full_name", sa.String(255), nullable=True),
        sa.Column("repository_url", sa.String(2048), nullable=True),
        sa.Column("workflow_name", sa.String(255), nullable=True),
        sa.Column("workflow_path", sa.String(2048), nullable=True),
        sa.Column("workflow_url", sa.String(2048), nullable=True),
        sa.Column("github_workflow_id", sa.Integer(), nullable=True),
        sa.Column("cron_expression", sa.String(255), nullable=True),
        sa.Column("ref", sa.String(255), nullable=True),
        sa.Column("resolved_ref", sa.String(255), nullable=True),
        sa.Column("inputs", sa.JSON(), nullable=True),
    )
    op.create_index(
        "ix_dispatch_logs_schedule_id", "dispatch_logs", ["schedule_id"]
    )
    op.create_index(
        "ix_dispatch_logs_triggered_at", "dispatch_logs", ["triggered_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_dispatch_logs_triggered_at", table_name="dispatch_logs")
    op.drop_index("ix_dispatch_logs_schedule_id", table_name="dispatch_logs")
    op.drop_table("dispatch_logs")
