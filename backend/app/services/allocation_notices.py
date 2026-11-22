from collections import Counter
from dataclasses import replace

from sqlalchemy import select

from app.core.config import get_settings
from app.core.errors import AppError
from app.models.base_types import new_uuid
from app.models.community import AllocationNotice, PartnerMessage
from app.models.offer import MatchOffer
from app.services.matching_service import build_rescue_input, evaluate_candidates, load_candidates
from app.services.rescue_helpers import ensure_utc
from app.services.rescue_service import iso_utc

OPEN_STATUSES = {"POSTED", "MATCHING", "OFFERED"}


def puzzle_is_open(rescue, now):
    return rescue.status in OPEN_STATUSES and ensure_utc(rescue.pickup_by) > now


def puzzle_data(db, rescue, now):
    excluded = set(db.scalars(select(MatchOffer.receiver_organization_id).where(
        MatchOffer.rescue_id == rescue.id, MatchOffer.status == "DECLINED",
    )))
    candidates = [candidate for candidate in load_candidates(db, rescue, now)
                  if candidate.verification_status == "VERIFIED" and candidate.receiver_organization_id not in excluded]
    buffer = get_settings().MATCHING_SAFETY_BUFFER_MINUTES
    eligible = {candidate.receiver_organization_id: [] for candidate in candidates}
    travel = {}
    for item in rescue.food_items:
        single_serving = replace(build_rescue_input(rescue, [item]), total_servings=1, requires_refrigeration=False)
        for result in evaluate_candidates(single_serving, candidates, now, buffer):
            travel[result.receiver_organization_id] = result.travel_minutes + buffer
            if result.feasible:
                eligible[result.receiver_organization_id].append(str(item.id))
    return {
        "items": [{"id": str(item.id), "name": item.name, "diet": item.dietary_type,
                   "servings": item.quantity_servings} for item in rescue.food_items],
        "requires_refrigeration": rescue.handling_type == "REFRIGERATED",
        "pickup_by": iso_utc(rescue.pickup_by),
        "receivers": [{
            "id": str(candidate.receiver_organization_id), "name": candidate.receiver_name,
            "capacity": candidate.available_servings, "volunteers": candidate.volunteer_servings,
            "refrigeration": candidate.refrigeration_available,
            "pickup_minutes": round(travel.get(candidate.receiver_organization_id, 0), 2),
            "eligible_items": eligible[candidate.receiver_organization_id],
        } for candidate in candidates],
    }


def latest_notices(db, rescue_id):
    rows = db.execute(select(AllocationNotice, PartnerMessage)
        .join(PartnerMessage, AllocationNotice.message_id == PartnerMessage.id)
        .where(AllocationNotice.rescue_id == rescue_id)
        .order_by(PartnerMessage.created_at.desc(), PartnerMessage.id.desc())).all()
    latest = {}
    for notice, message in rows:
        latest.setdefault(message.recipient_org_id, (notice, message))
    return latest


def notice_summary(notice, message):
    return {
        "receiver_id": str(message.recipient_org_id),
        "items": notice.items,
        "sent_at": iso_utc(message.created_at),
        "read_at": iso_utc(message.read_at),
    }


def send_notices(db, rescue, proposals, now):
    latest = latest_notices(db, rescue.id)
    data = puzzle_data(db, rescue, now)
    receivers = {receiver["id"]: receiver for receiver in data["receivers"]}
    posted = {item["id"]: item for item in data["items"]}
    quantities = Counter()
    recipients = set()
    results = []
    pending = []
    for proposal in proposals:
        recipient = proposal.receiver_id
        if recipient in recipients:
            raise AppError("DUPLICATE_RECEIVER", "Select each receiver once.", 422)
        recipients.add(recipient)
        receiver = receivers.get(str(recipient))
        items = []
        item_ids = set()
        for line in sorted(proposal.items, key=lambda line: line.item_id):
            item_id = str(line.item_id)
            if item_id in item_ids or item_id not in posted:
                raise AppError("INVALID_ALLOCATION_ITEM", "Choose each posted food item at most once per receiver.", 422)
            item_ids.add(item_id)
            quantities[item_id] += line.servings
            items.append({**posted[item_id], "servings": line.servings})
        count = sum(item["servings"] for item in items)
        previous = latest.get(recipient)
        if previous and previous[0].items == items:
            results.append(notice_summary(*previous))
            continue
        if not puzzle_is_open(rescue, now):
            raise AppError("ALLOCATION_CLOSED", "This rescue is no longer open for allocation proposals.", 409)
        if not receiver:
            raise AppError("ALLOCATION_CHANGED", "A selected receiver is no longer available. Refresh the plan.", 409)
        capacity = receiver["volunteers"]
        if capacity is None:
            capacity = receiver["capacity"]
        if (not item_ids.issubset(receiver["eligible_items"])
                or count > min(receiver["capacity"], capacity)
                or (data["requires_refrigeration"] and not receiver["refrigeration"])):
            raise AppError("ALLOCATION_CHANGED",
                           f"{receiver['name']} cannot take this proposal with their current settings. Adjust the plan and try again.", 409)
        pending.append((recipient, items, count, bool(previous)))
    if any(total > posted[item_id]["servings"] for item_id, total in quantities.items()):
        raise AppError("ALLOCATION_EXCEEDS_POSTED", "The selected proposals exceed the posted quantity of a food item.", 422)
    for recipient, items, count, is_update in pending:
        title = "Updated split proposal" if is_update else "Split proposal"
        message = PartnerMessage(id=new_uuid(), sender_org_id=rescue.donor_organization_id,
                                 recipient_org_id=recipient, created_at=now,
                                 message=f"{title} for {rescue.display_id} · {count} servings")
        notice = AllocationNotice(message_id=message.id, rescue_id=rescue.id, items=items)
        db.add(message)
        db.flush()
        db.add(notice)
        results.append(notice_summary(notice, message))
    return {"notices": results, "sent": len(pending)}
