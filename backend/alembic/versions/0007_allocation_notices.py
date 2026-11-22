"""Store allocation proposals sent through partner messages."""

from alembic import op
from app.models.community import AllocationNotice

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    AllocationNotice.__table__.create(op.get_bind(), checkfirst=True)


def downgrade():
    AllocationNotice.__table__.drop(op.get_bind(), checkfirst=True)
