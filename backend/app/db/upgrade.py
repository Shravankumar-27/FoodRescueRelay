"""Idempotent upgrade for existing demo databases and Alembic deployments."""
from sqlalchemy import inspect, Boolean, Column, Float, Integer, String, JSON, text, Uuid
from alembic.migration import MigrationContext
from alembic.operations import Operations


def upgrade_schema(connection):
    ops = Operations(MigrationContext.configure(connection))
    additions = {
        "organizations": [Column("trust_score", Float, server_default="0.5", nullable=False), Column("rank_badge", String(16), server_default="NEW", nullable=False)],
        "food_items": [Column("food_category", String(32), server_default="COOKED_MEAL", nullable=False)],
        "receiver_capacities": [
            Column("accepted_dietary_types", JSON, server_default=text("'[]'"), nullable=False),
            Column("accepted_food_categories", JSON, server_default=text("'[]'"), nullable=False),
            Column("excluded_allergens", JSON, server_default=text("'[]'"), nullable=False),
            Column("description", String(500), server_default="", nullable=False),
        ],
    }
    for table, columns in additions.items():
        existing = {c["name"] for c in inspect(connection).get_columns(table)}
        for column in columns:
            if column.name not in existing:
                ops.add_column(table, column)
    for constraint in inspect(connection).get_check_constraints("food_items"):
        if "dietary_type" in constraint["sqltext"] and "RAW_VEGAN" not in constraint["sqltext"]:
            from app.models.enums import DietaryType
            values = ", ".join(repr(t.value) for t in DietaryType)
            with ops.batch_alter_table("food_items") as batch:
                batch.drop_constraint(constraint["name"], type_="check")
                batch.create_check_constraint(constraint["name"], f"dietary_type IN ({values})")
    if inspect(connection).has_table("chat_messages") and "offer_id" not in {c["name"] for c in inspect(connection).get_columns("chat_messages")}:
        ops.add_column("chat_messages", Column("offer_id", Uuid, nullable=True))

def upgrade_handoff_workflows(connection):
    ops = Operations(MigrationContext.configure(connection))
    for table, columns in {
        "rescues": [Column("donor_transport_available", Boolean, server_default=text("false"), nullable=False)],
        "receiver_capacities": [
            Column("containers_available", Boolean, server_default=text("true"), nullable=False),
            Column("refrigeration_available", Boolean, server_default=text("false"), nullable=False),
            Column("volunteer_servings", Integer, nullable=True),
        ],
    }.items():
        existing = {c["name"] for c in inspect(connection).get_columns(table)}
        for column in columns:
            if column.name not in existing:
                ops.add_column(table, column)
