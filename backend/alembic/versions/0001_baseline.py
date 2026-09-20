"""Baseline schema: tenants, operators, compliance_logs.

Revision ID: 0001_baseline
Revises: None

Matches the models as of the production-hardening commit (before the
manager-review columns were added). Fresh databases should be created with
``alembic upgrade head``; existing dev databases created via
AUTO_CREATE_TABLES already have this shape — stamp them instead of
re-running: ``alembic stamp 0001_baseline``.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_baseline"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "operators",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("operator_code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("pin_hash", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("tenant_id", "operator_code", name="uq_operator_tenant_code"),
    )
    op.create_index("ix_operators_tenant_id", "operators", ["tenant_id"])

    op.create_table(
        "compliance_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.Column("operator_id", sa.String(50), nullable=False),
        sa.Column("log_type", sa.String(20), nullable=True),
        sa.Column("photo_storage_url", sa.String(512), nullable=True),
        sa.Column("ai_confidence_score", sa.Float(), nullable=True),
        sa.Column("extracted_volume_gallons", sa.Float(), nullable=True),
        sa.Column("structural_integrity_flag", sa.Boolean(), nullable=True),
        sa.Column("status", sa.String(20), nullable=True),
        sa.Column("manager_notes", sa.Text(), nullable=True),
    )
    op.create_index("ix_compliance_logs_tenant_id", "compliance_logs", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_compliance_logs_tenant_id", table_name="compliance_logs")
    op.drop_table("compliance_logs")
    op.drop_index("ix_operators_tenant_id", table_name="operators")
    op.drop_table("operators")
    op.drop_table("tenants")
