"""partial unique index: one ACCEPTED offer per rescue

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-21 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "uq_one_accepted_offer_per_rescue",
        "match_offers",
        ["rescue_id"],
        unique=True,
        sqlite_where=sa.text("status = 'ACCEPTED'"),
        postgresql_where=sa.text("status = 'ACCEPTED'"),
    )


def downgrade() -> None:
    op.drop_index("uq_one_accepted_offer_per_rescue", table_name="match_offers")
