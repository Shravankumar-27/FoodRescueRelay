"""initial schema: all RescueRelay tables

Revision ID: 0001
Revises: 
Create Date: 2026-11-21 17:11:04.810903

Mirrors the models in app/models. Keep this file in sync with the models
only by adding new revisions; do not edit it once it has been applied.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("organization_type", sa.String(32), nullable=False),
        sa.Column("verification_status", sa.String(32), nullable=False),
        sa.Column("locality", sa.String(200), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("private_address", sa.String(300), nullable=True),
        sa.Column("private_phone", sa.String(40), nullable=True),
        sa.Column("reliability", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "organization_type IN ('CATERER', 'NGO', 'COMMUNITY_KITCHEN', 'SHELTER', 'ADMIN')",
            name="organization_type_allowed",
        ),
        sa.CheckConstraint(
            "verification_status IN ('PENDING', 'VERIFIED', 'SUSPENDED')",
            name="verification_status_allowed",
        ),
        sa.CheckConstraint("reliability >= 0 AND reliability <= 1", name="reliability_range"),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("role IN ('DONOR', 'RECEIVER', 'ADMIN')", name="role_allowed"),
    )
    op.create_index("ix_users_organization_id", "users", ["organization_id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "receiver_capacities",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("available", sa.Boolean(), nullable=False),
        sa.Column("max_servings", sa.Integer(), nullable=False),
        sa.Column("available_servings", sa.Integer(), nullable=False),
        sa.Column("accepts_veg", sa.Boolean(), nullable=False),
        sa.Column("accepts_non_veg", sa.Boolean(), nullable=False),
        sa.Column("transport_available", sa.Boolean(), nullable=False),
        sa.Column("need_level", sa.String(16), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("max_servings >= 0", name="max_servings_non_negative"),
        sa.CheckConstraint(
            "available_servings >= 0 AND available_servings <= max_servings",
            name="available_servings_range",
        ),
        sa.CheckConstraint("need_level IN ('LOW', 'MEDIUM', 'HIGH')", name="need_level_allowed"),
    )

    op.create_table(
        "rescues",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("display_id", sa.String(12), nullable=False),
        sa.Column("donor_organization_id", sa.Uuid(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("prepared_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("pickup_by", sa.DateTime(timezone=True), nullable=False),
        sa.Column("handling_type", sa.String(24), nullable=False),
        sa.Column("handling_notes", sa.Text(), nullable=True),
        sa.Column("untouched_confirmed", sa.Boolean(), nullable=False),
        sa.Column("packaging_available", sa.Boolean(), nullable=False),
        sa.Column("safety_attestation", sa.Boolean(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("private_address", sa.String(300), nullable=False),
        sa.Column("locality", sa.String(200), nullable=False),
        sa.Column("total_servings", sa.Integer(), nullable=False),
        sa.Column("dietary_type", sa.String(16), nullable=False),
        sa.Column("idempotency_key", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("donor_organization_id", "idempotency_key", name="uq_rescue_donor_idempotency"),
        sa.CheckConstraint("total_servings > 0", name="ck_rescues_total_servings_positive"),
        sa.CheckConstraint("pickup_by > created_at", name="ck_rescues_pickup_after_created"),
        sa.CheckConstraint(
            "status IN ('POSTED', 'MATCHING', 'OFFERED', 'CLAIMED', 'COLLECTED', 'DELIVERED', 'EXPIRED', 'CANCELLED')",
            name="ck_rescues_status",
        ),
        sa.CheckConstraint(
            "handling_type IN ('HOT_HELD', 'REFRIGERATED', 'ROOM_TEMPERATURE', 'OTHER', 'UNKNOWN')",
            name="ck_rescues_handling_type",
        ),
        sa.CheckConstraint(
            "dietary_type IN ('VEG', 'NON_VEG', 'VEGAN', 'OTHER', 'UNKNOWN')",
            name="ck_rescues_dietary_type",
        ),
    )
    op.create_index("ix_rescues_display_id", "rescues", ["display_id"], unique=True)
    op.create_index("ix_rescues_donor_organization_id", "rescues", ["donor_organization_id"])
    op.create_index("ix_rescues_status", "rescues", ["status"])

    op.create_table(
        "food_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("rescue_id", sa.Uuid(), sa.ForeignKey("rescues.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("quantity_servings", sa.Integer(), nullable=False),
        sa.Column("dietary_type", sa.String(16), nullable=False),
        sa.Column("allergens", sa.JSON(), nullable=True),
        sa.Column("allergen_info_unknown", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("quantity_servings > 0", name="ck_food_items_quantity_positive"),
        sa.CheckConstraint(
            "dietary_type IN ('VEG', 'NON_VEG', 'VEGAN', 'OTHER', 'UNKNOWN')",
            name="ck_food_items_dietary_type",
        ),
    )
    op.create_index("ix_food_items_rescue_id", "food_items", ["rescue_id"])

    op.create_table(
        "match_offers",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("rescue_id", sa.Uuid(), sa.ForeignKey("rescues.id", ondelete="CASCADE"), nullable=False),
        sa.Column("receiver_organization_id", sa.Uuid(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("proximity_score", sa.Float(), nullable=False),
        sa.Column("urgency_score", sa.Float(), nullable=False),
        sa.Column("need_score", sa.Float(), nullable=False),
        sa.Column("reliability_score", sa.Float(), nullable=False),
        sa.Column("fairness_score", sa.Float(), nullable=False),
        sa.Column("estimated_distance_km", sa.Float(), nullable=False),
        sa.Column("estimated_travel_minutes", sa.Float(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("offered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("rank >= 1", name="ck_match_offers_rank_positive"),
        sa.CheckConstraint(
            "status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'TIMED_OUT', 'CANCELLED')",
            name="ck_match_offers_status",
        ),
    )
    op.create_index("ix_match_offers_rescue_id", "match_offers", ["rescue_id"])
    op.create_index(
        "ix_match_offers_receiver_status",
        "match_offers",
        ["receiver_organization_id", "status"],
    )

    op.create_table(
        "handoffs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("rescue_id", sa.Uuid(), sa.ForeignKey("rescues.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("pickup_code_hash", sa.String(255), nullable=True),
        sa.Column("pickup_code_display", sa.String(255), nullable=True),
        sa.Column("pickup_code_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pickup_code_attempts", sa.Integer(), nullable=False),
        sa.Column("collected_servings", sa.Integer(), nullable=True),
        sa.Column("delivered_servings", sa.Integer(), nullable=True),
        sa.Column("rejected_servings", sa.Integer(), nullable=True),
        sa.Column("collected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("pickup_code_attempts >= 0", name="ck_handoffs_pickup_code_attempts_nonnegative"),
        sa.CheckConstraint(
            "delivered_servings IS NULL OR delivered_servings >= 0",
            name="ck_handoffs_delivered_servings_nonnegative",
        ),
        sa.CheckConstraint(
            "rejected_servings IS NULL OR rejected_servings >= 0",
            name="ck_handoffs_rejected_servings_nonnegative",
        ),
        sa.CheckConstraint(
            "collected_servings IS NULL OR delivered_servings IS NULL OR collected_servings >= delivered_servings",
            name="ck_handoffs_collected_gte_delivered",
        ),
        sa.CheckConstraint(
            "collected_servings IS NULL OR delivered_servings IS NULL OR rejected_servings IS NULL "
            "OR delivered_servings + rejected_servings <= collected_servings",
            name="ck_handoffs_delivered_rejected_lte_collected",
        ),
    )

    op.create_table(
        "impact_records",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("rescue_id", sa.Uuid(), sa.ForeignKey("rescues.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("donor_organization_id", sa.Uuid(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("receiver_organization_id", sa.Uuid(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("delivered_servings", sa.Integer(), nullable=False),
        sa.Column("confirmed_kg", sa.Float(), nullable=True),
        sa.Column("calculation_version", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "delivered_servings >= 0",
            name="ck_impact_records_delivered_servings_nonnegative",
        ),
    )
    op.create_index("ix_impact_records_donor_organization_id", "impact_records", ["donor_organization_id"])
    op.create_index("ix_impact_records_receiver_organization_id", "impact_records", ["receiver_organization_id"])

    op.create_table(
        "status_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("rescue_id", sa.Uuid(), sa.ForeignKey("rescues.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("from_status", sa.String(20), nullable=True),
        sa.Column("to_status", sa.String(20), nullable=False),
        sa.Column("reason", sa.String(300), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_status_events_rescue_id", "status_events", ["rescue_id"])
    op.create_index("ix_status_events_created_at", "status_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_status_events_created_at", table_name="status_events")
    op.drop_index("ix_status_events_rescue_id", table_name="status_events")
    op.drop_table("status_events")
    op.drop_index("ix_impact_records_receiver_organization_id", table_name="impact_records")
    op.drop_index("ix_impact_records_donor_organization_id", table_name="impact_records")
    op.drop_table("impact_records")
    op.drop_table("handoffs")
    op.drop_index("ix_match_offers_receiver_status", table_name="match_offers")
    op.drop_index("ix_match_offers_rescue_id", table_name="match_offers")
    op.drop_table("match_offers")
    op.drop_index("ix_food_items_rescue_id", table_name="food_items")
    op.drop_table("food_items")
    op.drop_index("ix_rescues_status", table_name="rescues")
    op.drop_index("ix_rescues_donor_organization_id", table_name="rescues")
    op.drop_index("ix_rescues_display_id", table_name="rescues")
    op.drop_table("rescues")
    op.drop_table("receiver_capacities")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_organization_id", table_name="users")
    op.drop_table("users")
    op.drop_table("organizations")
