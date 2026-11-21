"""Shared string enums for RescueRelay models.

Values are stored in the database as plain strings (``enum.value``), so the
check constraints in the models mirror these members exactly.
"""

import enum


class OrganizationType(str, enum.Enum):
    CATERER = "CATERER"
    NGO = "NGO"
    COMMUNITY_KITCHEN = "COMMUNITY_KITCHEN"
    SHELTER = "SHELTER"
    ADMIN = "ADMIN"


class VerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    SUSPENDED = "SUSPENDED"


class UserRole(str, enum.Enum):
    DONOR = "DONOR"
    RECEIVER = "RECEIVER"
    ADMIN = "ADMIN"


class RescueStatus(str, enum.Enum):
    POSTED = "POSTED"
    MATCHING = "MATCHING"
    OFFERED = "OFFERED"
    CLAIMED = "CLAIMED"
    COLLECTED = "COLLECTED"
    DELIVERED = "DELIVERED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class HandlingType(str, enum.Enum):
    HOT_HELD = "HOT_HELD"
    REFRIGERATED = "REFRIGERATED"
    ROOM_TEMPERATURE = "ROOM_TEMPERATURE"
    OTHER = "OTHER"
    UNKNOWN = "UNKNOWN"


class DietaryType(str, enum.Enum):
    VEG = "VEG"
    NON_VEG = "NON_VEG"
    VEGAN = "VEGAN"
    JAIN = "JAIN"
    HALAL = "HALAL"
    GLUTEN_FREE = "GLUTEN_FREE"
    DIABETIC_FRIENDLY = "DIABETIC_FRIENDLY"
    RAW_VEGAN = "RAW_VEGAN"
    OTHER = "OTHER"
    UNKNOWN = "UNKNOWN"


class FoodCategory(str, enum.Enum):
    COOKED_MEAL = "COOKED_MEAL"
    BAKERY = "BAKERY"
    FRUIT_VEG = "FRUIT_VEG"
    DAIRY = "DAIRY"
    PACKAGED = "PACKAGED"
    BEVERAGES = "BEVERAGES"
    DESSERTS = "DESSERTS"
    OTHER = "OTHER"


class NeedLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class OfferStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    TIMED_OUT = "TIMED_OUT"
    CANCELLED = "CANCELLED"
