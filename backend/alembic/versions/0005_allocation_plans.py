"""Receiver allocation drafts. Revision 0005, parent 0004."""
from alembic import op
from app.models.allocation import FoodAllocationPlan
revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    FoodAllocationPlan.__table__.create(op.get_bind(), checkfirst=True)


def downgrade():
    FoodAllocationPlan.__table__.drop(op.get_bind())
