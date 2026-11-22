"""Distance and travel-time helpers for matching.

These are documented approximations, not live traffic data:

* Straight-line distance uses the haversine formula on a sphere of radius
  ``EARTH_RADIUS_KM``.
* Road distance is estimated as straight-line distance times ``ROAD_FACTOR``.
* Travel time is road distance divided by ``AVERAGE_SPEED_KMH``.

The values are deterministic so the same inputs always rank the same way.
"""

from __future__ import annotations

import math

EARTH_RADIUS_KM = 6371.0
ROAD_FACTOR = 1.4
AVERAGE_SPEED_KMH = 20.0

# Approximate points for the neighborhoods supported by the Hyderabad pilot.
SIGNUP_LOCALITIES = {
    "Banjara Hills": (17.4126, 78.4499),
    "Gachibowli": (17.4400, 78.3489),
    "Hitech City": (17.4435, 78.3772),
    "Jubilee Hills": (17.4229, 78.4079),
    "Kondapur": (17.4619, 78.3564),
    "Kukatpally": (17.4949, 78.3996),
    "LB Nagar": (17.3523, 78.5476),
    "Madhapur": (17.4483, 78.3915),
    "Medchal": (17.5929, 78.5121),
    "Miyapur": (17.5003, 78.3515),
    "Nanakramguda": (17.4320, 78.3610),
    "Secunderabad": (17.4474, 78.4985),
    "Uppal": (17.4051, 78.5590),
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in kilometres between two coordinates."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    a = min(1.0, max(0.0, a))
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def road_distance_km(straight_km: float) -> float:
    """Estimate road distance from a straight-line distance."""
    return straight_km * ROAD_FACTOR


def travel_minutes(road_km: float) -> float:
    """Estimate travel time in minutes for a road distance at the average speed."""
    return road_km / AVERAGE_SPEED_KMH * 60
