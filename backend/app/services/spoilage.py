"""Conservative, unverified assumptions for synthetic rescue planning."""

from datetime import timedelta

HOURS = {
    "COOKED_MEAL": 2.5, "BAKERY": 3, "FRUIT_VEG": 2, "DAIRY": 1.5,
    "PACKAGED": 3, "BEVERAGES": 2, "DESSERTS": 1.5, "OTHER": 1.5,
}
DELIVERY_MINUTES = 30
GUIDANCE = "Default guidance, not a food-safety certification."


def hold_time_table():
    return [
        {
            "category": category, "max_hours": hours,
            "storage_note": "Record the holding condition and keep packaging intact.",
            "allergen_prompt": "List known allergens or mark allergen information unknown.",
            "source": "Synthetic planning placeholder", "verified": False,
        }
        for category, hours in HOURS.items()
    ]


def deadlines(payload, prepared_at, requested_pickup):
    hours = min(
        min(HOURS[item.food_category.value], (payload.hold_hours or {}).get(item.food_category.value, float("inf")))
        for item in payload.food_items
    )
    consume_by = prepared_at + timedelta(hours=hours)
    return consume_by, min(requested_pickup, consume_by - timedelta(minutes=DELIVERY_MINUTES))
