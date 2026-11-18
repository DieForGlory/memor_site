"""Заявка: жилой комплекс из каталога CRM

Revision ID: 5b1f0c2a9d47
Revises: 2373a886bf5b
Create Date: 2026-11-17
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "5b1f0c2a9d47"
down_revision: str | None = "2373a886bf5b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("leads") as batch:
        batch.add_column(sa.Column("crm_project_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("crm_project_name", sa.String(length=200), nullable=False, server_default=""))


def downgrade() -> None:
    with op.batch_alter_table("leads") as batch:
        batch.drop_column("crm_project_name")
        batch.drop_column("crm_project_id")
