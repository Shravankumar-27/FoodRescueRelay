"""Trust, food preferences and private conversations.

Revision ID: 0003
Revises: 0002
"""
from alembic import op
from app.db.upgrade import upgrade_schema
from app.models.chat_message import ChatMessage

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    upgrade_schema(op.get_bind())
    ChatMessage.__table__.create(op.get_bind(), checkfirst=True)
    from app.models.community import PartnerMessage, PartnerRating, OrganizationAudit
    PartnerMessage.__table__.create(op.get_bind(), checkfirst=True)
    PartnerRating.__table__.create(op.get_bind(), checkfirst=True)
    OrganizationAudit.__table__.create(op.get_bind(), checkfirst=True)


def downgrade():
    raise RuntimeError("This data-preserving migration requires a database backup to downgrade.")
