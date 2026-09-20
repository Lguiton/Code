"""Manager review audit trail on compliance_logs.

Revision ID: 0002_log_review_columns
Revises: 0001_baseline

Adds reviewed_by (operator id of the reviewer) and reviewed_at so every
approve/override decision on an AI verdict is attributable.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_log_review_columns"
down_revision: Union[str, Sequence[str], None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("compliance_logs", sa.Column("reviewed_by", sa.String(36), nullable=True))
    op.add_column("compliance_logs", sa.Column("reviewed_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("compliance_logs", "reviewed_at")
    op.drop_column("compliance_logs", "reviewed_by")
