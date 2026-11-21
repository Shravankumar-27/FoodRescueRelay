"""Deterministic rescue-to-receiver matching.

Ranking uses fixed weights over rule-based factors. The same inputs always
produce the same ranking; no model or external service is involved.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.errors import AppError
from app.models.enums import DietaryType, NeedLevel, OrganizationType, VerificationStatus
from app.models.impact import ImpactRecord
from app.models.organization import Organization
from app.models.receiver_capacity import ReceiverCapacity
from app.models.rescue import Rescue
from app.services import geo
from app.services.rescue_helpers import ensure_utc

WEIGHTS: dict[str, float] = {
    "proximity": 0.35,
    "urgency": 0.30,
    "need": 0.20,
    "reliability": 0.10,
    "fairness": 0.05,
}

NEED_SCORE: dict[str, float] = {
    NeedLevel.HIGH.value: 1.0,
    NeedLevel.MEDIUM.value: 0.6,
    NeedLevel.LOW.value: 0.3,
}
DEFAULT_NEED_SCORE = 0.3

PROXIMITY_HORIZON_KM = 15.0
URGENCY_HORIZON_MINUTES = 120.0
RECENT_WINDOW = timedelta(hours=24)
NON_RECEIVER_TYPES: tuple[str, ...] = (OrganizationType.CATERER.value, OrganizationType.ADMIN.value)


@dataclass(frozen=True)
class CandidateInput:
    receiver_organization_id: uuid.UUID
    receiver_name: str
    locality: str
    latitude: float
    longitude: float
    reliability: float
    available: bool
    available_servings: int
    accepts_veg: bool
    accepts_non_veg: bool
    transport_available: bool
    need_level: str
    verification_status: str
    organization_type: str
    recent_completed_count_24h: int


@dataclass(frozen=True)
class RescueInput:
    rescue_id: uuid.UUID
    latitude: float
    longitude: float
    total_servings: int
    has_non_veg: bool
    dietary_types: frozenset[str]
    pickup_by: datetime
    prepared_at: datetime
    rescue_status: str


@dataclass
class CandidateResult:
    receiver_organization_id: uuid.UUID
    receiver_name: str
    locality: str
    feasible: bool
    rejection_reasons: list[str] = field(default_factory=list)
    distance_km: float = 0.0
    travel_minutes: float = 0.0
    slack_minutes: float = 0.0
    factors: dict[str, float] = field(default_factory=dict)
    score: float = 0.0
    why: list[str] = field(default_factory=list)


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def _rejection_reasons(rescue: RescueInput, cand: CandidateInput, slack_minutes: float) -> list[str]:
    reasons: list[str] = []
    if cand.verification_status != VerificationStatus.VERIFIED.value:
        reasons.append("Receiver is not verified")
    if cand.organization_type in NON_RECEIVER_TYPES:
        reasons.append("Organization type cannot receive food")
    if not cand.available:
        reasons.append("Receiver is currently unavailable")
    if cand.available_servings < rescue.total_servings:
        reasons.append(
            f"Capacity of {cand.available_servings} servings is below the "
            f"{rescue.total_servings} servings needed"
        )
    if rescue.has_non_veg and not cand.accepts_non_veg:
        reasons.append("Does not accept non-vegetarian food")
    if not rescue.has_non_veg and not cand.accepts_veg:
        reasons.append("Does not accept vegetarian food")
    if not cand.transport_available:
        reasons.append("No transport available")
    if slack_minutes < 0:
        reasons.append("Cannot reach before pickup deadline")
    return reasons


def _score_feasible(
    result: CandidateResult,
    rescue: RescueInput,
    cand: CandidateInput,
    road_km: float,
    slack_minutes: float,
) -> None:
    factors = {
        "proximity": max(0.0, 1.0 - road_km / PROXIMITY_HORIZON_KM),
        "urgency": _clamp(slack_minutes / URGENCY_HORIZON_MINUTES),
        "need": NEED_SCORE.get(cand.need_level, DEFAULT_NEED_SCORE),
        "reliability": _clamp(cand.reliability),
        "fairness": 1.0 / (1 + cand.recent_completed_count_24h),
    }
    result.factors = factors
    result.score = round(sum(WEIGHTS[name] * value for name, value in factors.items()), 4)
    result.why = [
        f"Can accept all {rescue.total_servings} servings",
        f"Estimated {round(result.travel_minutes)} min travel",
        "Pickup feasible before deadline",
        f"{cand.need_level.capitalize()} current need",
        "Verified receiver",
        f"Estimated {result.distance_km:.1f} km away",
    ]


def evaluate_candidates(
    rescue: RescueInput,
    candidates: Sequence[CandidateInput],
    now: datetime,
    buffer_minutes: int,
) -> list[CandidateResult]:
    """Score every candidate. Feasible results come first, best score first.

    Infeasible results follow, sorted by receiver name, each with its reasons.
    """
    now_utc = ensure_utc(now)
    pickup_by = ensure_utc(rescue.pickup_by)
    minutes_to_pickup = (pickup_by - now_utc).total_seconds() / 60.0

    feasible: list[CandidateResult] = []
    infeasible: list[CandidateResult] = []
    for cand in candidates:
        road_km = geo.road_distance_km(
            geo.haversine_km(rescue.latitude, rescue.longitude, cand.latitude, cand.longitude)
        )
        travel = geo.travel_minutes(road_km)
        slack = minutes_to_pickup - travel - buffer_minutes
        reasons = _rejection_reasons(rescue, cand, slack)
        result = CandidateResult(
            receiver_organization_id=cand.receiver_organization_id,
            receiver_name=cand.receiver_name,
            locality=cand.locality,
            feasible=not reasons,
            rejection_reasons=reasons,
            distance_km=road_km,
            travel_minutes=travel,
            slack_minutes=slack,
        )
        if reasons:
            infeasible.append(result)
        else:
            _score_feasible(result, rescue, cand, road_km, slack)
            feasible.append(result)

    feasible.sort(key=lambda r: (-r.score, r.travel_minutes, r.receiver_name))
    infeasible.sort(key=lambda r: r.receiver_name)
    return feasible + infeasible


def feasible_ranked(results: Sequence[CandidateResult]) -> list[CandidateResult]:
    """Return only the feasible results, in their existing (ranked) order."""
    return [r for r in results if r.feasible]


def load_candidates(db: Session, rescue: Rescue, now: datetime) -> list[CandidateInput]:
    """Load receiver candidates and their 24h completed counts in two queries."""
    rows = db.execute(
        select(Organization, ReceiverCapacity)
        .join(ReceiverCapacity, ReceiverCapacity.organization_id == Organization.id)
        .where(
            Organization.organization_type.not_in(NON_RECEIVER_TYPES),
            Organization.id != rescue.donor_organization_id,
        )
    ).all()

    since = ensure_utc(now) - RECENT_WINDOW
    count_rows = db.execute(
        select(ImpactRecord.receiver_organization_id, func.count(ImpactRecord.id))
        .where(ImpactRecord.created_at >= since)
        .group_by(ImpactRecord.receiver_organization_id)
    ).all()
    recent_counts = {org_id: int(count) for org_id, count in count_rows}

    candidates: list[CandidateInput] = []
    for org, capacity in rows:
        candidates.append(
            CandidateInput(
                receiver_organization_id=org.id,
                receiver_name=org.name,
                locality=org.locality,
                latitude=org.latitude,
                longitude=org.longitude,
                reliability=org.reliability,
                available=capacity.available,
                available_servings=capacity.available_servings,
                accepts_veg=capacity.accepts_veg,
                accepts_non_veg=capacity.accepts_non_veg,
                transport_available=capacity.transport_available,
                need_level=capacity.need_level,
                verification_status=org.verification_status,
                organization_type=org.organization_type,
                recent_completed_count_24h=recent_counts.get(org.id, 0),
            )
        )
    return candidates


def match_rescue(
    db: Session,
    rescue_id: uuid.UUID,
    now: datetime | None = None,
) -> list[CandidateResult]:
    """Evaluate every receiver for one rescue at ``now`` (UTC by default)."""
    current = ensure_utc(now) if now is not None else datetime.now(timezone.utc)
    rescue = db.scalar(
        select(Rescue).where(Rescue.id == rescue_id).options(selectinload(Rescue.food_items))
    )
    if rescue is None:
        raise AppError("RESCUE_NOT_FOUND", "Rescue was not found.", 404)

    dietary_types = frozenset(item.dietary_type for item in rescue.food_items)
    rescue_input = RescueInput(
        rescue_id=rescue.id,
        latitude=rescue.latitude,
        longitude=rescue.longitude,
        total_servings=rescue.total_servings,
        has_non_veg=DietaryType.NON_VEG.value in dietary_types,
        dietary_types=dietary_types,
        pickup_by=ensure_utc(rescue.pickup_by),
        prepared_at=ensure_utc(rescue.prepared_at),
        rescue_status=rescue.status,
    )
    candidates = load_candidates(db, rescue, current)
    return evaluate_candidates(
        rescue_input,
        candidates,
        current,
        get_settings().MATCHING_SAFETY_BUFFER_MINUTES,
    )
