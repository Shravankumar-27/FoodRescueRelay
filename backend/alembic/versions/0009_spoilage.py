"""Add spoilage deadlines, escalation state and ID check records."""

from alembic import op

from app.db.upgrade import upgrade_spoilage

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade():
    upgrade_spoilage(op.get_bind())


def downgrade():
    op.drop_table("demo_clock")
    op.drop_index("ix_rescues_event_share_token", table_name="rescues")
    for column in ("event_share_token", "consume_by", "escalation_stage", "on_the_way_at"):
        op.drop_column("rescues", column)
    op.drop_column("organizations", "id_checked")
