"""Receiver-issued donor recognition.

Revision ID: 0004
Revises: 0003
"""
from alembic import op
from app.models.recognition import DonationRecognition

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    from app.db.upgrade import upgrade_schema
    upgrade_schema(op.get_bind())
    DonationRecognition.__table__.create(op.get_bind(), checkfirst=True)


def downgrade():
    DonationRecognition.__table__.drop(op.get_bind())
