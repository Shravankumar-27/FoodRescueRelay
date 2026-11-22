"""Persist favorite partners and the logistics provider directory."""

from alembic import op

from app.models.community import FavoritePartner
from app.models.handoff_workflow import LogisticsProvider

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    for model in (FavoritePartner, LogisticsProvider):
        model.__table__.create(op.get_bind(), checkfirst=True)


def downgrade():
    for model in (LogisticsProvider, FavoritePartner):
        model.__table__.drop(op.get_bind(), checkfirst=True)
