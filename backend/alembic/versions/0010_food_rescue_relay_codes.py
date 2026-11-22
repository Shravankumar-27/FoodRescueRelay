"""Rename public rescue codes to the Food Rescue Relay prefix."""

from alembic import op
from sqlalchemy import text


revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    # Keep existing code suffixes and links stable while changing the public prefix.
    connection.execute(
        text("UPDATE rescues SET display_id = 'FRR-' || substr(display_id, 4) "
             "WHERE display_id LIKE :old_prefix"),
        {"old_prefix": "RR-%"},
    )
    connection.execute(
        text("UPDATE partner_messages SET message = replace(message, 'RR-', 'FRR-') "
             "WHERE message LIKE :old_code"),
        {"old_code": "%RR-%"},
    )


def downgrade():
    connection = op.get_bind()
    connection.execute(
        text("UPDATE rescues SET display_id = 'RR-' || substr(display_id, 5) "
             "WHERE display_id LIKE :new_prefix"),
        {"new_prefix": "FRR-%"},
    )
    connection.execute(
        text("UPDATE partner_messages SET message = replace(message, 'FRR-', 'RR-') "
             "WHERE message LIKE :new_code"),
        {"new_code": "%FRR-%"},
    )
