"""Add pickup logistics, structured feedback and receiver planning constraints."""

from alembic import op

from app.db.upgrade import upgrade_handoff_workflows
from app.models.handoff_workflow import MealFeedback, PickupLogistics

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    upgrade_handoff_workflows(connection)
    PickupLogistics.__table__.create(connection, checkfirst=True)
    MealFeedback.__table__.create(connection, checkfirst=True)


def downgrade():
    connection = op.get_bind()
    MealFeedback.__table__.drop(connection, checkfirst=True)
    PickupLogistics.__table__.drop(connection, checkfirst=True)
    with op.batch_alter_table("receiver_capacities") as batch:
        batch.drop_column("containers_available")
        batch.drop_column("refrigeration_available")
        batch.drop_column("volunteer_servings")
    with op.batch_alter_table("rescues") as batch:
        batch.drop_column("donor_transport_available")
