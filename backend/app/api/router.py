"""Versioned API router aggregating all route modules."""

from fastapi import APIRouter

from app.api import (
    routes_admin,
    routes_auth,
    routes_chat,
    routes_donor_impact,
    routes_health,
    routes_offers,
    routes_pickup,
    routes_receivers,
    routes_rescues,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(routes_health.router)
api_router.include_router(routes_auth.router)
api_router.include_router(routes_rescues.router)
api_router.include_router(routes_offers.router)
api_router.include_router(routes_receivers.router)
api_router.include_router(routes_admin.router)
api_router.include_router(routes_pickup.router)
api_router.include_router(routes_donor_impact.router)
api_router.include_router(routes_chat.router)

from app.api import routes_partners
api_router.include_router(routes_partners.router)
