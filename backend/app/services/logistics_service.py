from sqlalchemy import select

from app.models.handoff_workflow import LogisticsProvider, PickupLogistics
from app.models.offer import MatchOffer
from app.models.organization import Organization
from app.models.receiver_capacity import ReceiverCapacity

RESOURCES = ("containers", "transport")


def accepted_offer(db, rescue_id):
    return db.scalar(select(MatchOffer).where(
        MatchOffer.rescue_id == rescue_id, MatchOffer.status == "ACCEPTED"
    ))


def logistics_for(db, rescue, offer):
    record = db.get(PickupLogistics, offer.id)
    if record is None:
        capacity = db.scalar(select(ReceiverCapacity).where(
            ReceiverCapacity.organization_id == offer.receiver_organization_id
        ))
        record = PickupLogistics(
            offer_id=offer.id,
            donor_containers=rescue.packaging_available,
            donor_transport=rescue.donor_transport_available,
            receiver_containers=bool(capacity and capacity.containers_available),
            receiver_transport=bool(capacity and capacity.transport_available),
            arrangements={},
        )
    return record


def logistics_state(record):
    resources = {}
    for name in RESOURCES:
        donor = getattr(record, f"donor_{name}")
        receiver = getattr(record, f"receiver_{name}")
        provider = record.arrangements.get(name)
        resources[name] = {
            "donor": donor,
            "receiver": receiver,
            "provider": provider,
            "needs_help": not (donor or receiver or provider),
        }
    return resources


def provider_data(provider):
    return {
        "id": str(provider.id), "name": provider.name, "contact": provider.contact,
        "resource": provider.resource, "service_area": provider.service_area,
        "max_servings": provider.max_servings, "refrigeration": provider.refrigeration,
        "available": provider.available,
    }


def available_providers(db, rescue):
    areas = [rescue.locality.casefold()]
    donor = db.get(Organization, rescue.donor_organization_id)
    if donor and (rescue.latitude, rescue.longitude) == (donor.latitude, donor.longitude):
        areas.append(donor.locality.casefold())
    matches = db.scalars(select(LogisticsProvider).where(
        LogisticsProvider.available.is_(True),
        LogisticsProvider.max_servings >= rescue.total_servings,
    ).order_by(LogisticsProvider.name)).all()
    return [
        provider for provider in matches
        if any(provider.service_area.casefold() in area for area in areas)
        and (rescue.handling_type != "REFRIGERATED" or provider.refrigeration)
    ]
