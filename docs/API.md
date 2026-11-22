# RescueRelay API reference

This document describes the HTTP API as implemented in `backend/app/api/`. Every field name, role and error code below was checked against the route modules, schemas and services.

Interactive docs (Swagger UI) are served by FastAPI at **http://localhost:8000/docs** while the backend is running.

## Base path

All routes are under:

```
http://localhost:8000/api/v1
```

The base path is set in `backend/app/api/router.py` (`APIRouter(prefix="/api/v1")`). The only route outside this prefix is the Swagger UI itself.

## Response envelopes

### Success

```json
{
  "success": true,
  "data": { ... },
  "request_id": "9f1c2e4a7b3d4e5f8a6b1c2d3e4f5a6b"
}
```

`data` is an object for single-resource routes and an array for list routes. Every response also carries an `X-Request-ID` header with the same value as `request_id`.

### Error

```json
{
  "success": false,
  "error": {
    "code": "OFFER_NOT_PENDING",
    "message": "This offer is no longer available."
  },
  "request_id": "9f1c2e4a7b3d4e5f8a6b1c2d3e4f5a6b"
}
```

Validation failures (HTTP 422, code `VALIDATION_ERROR`) add a `details` list inside `error`, with one `{field, message}` entry per invalid field.

Use `error.code` to branch in clients. `error.message` is human-readable and may change.

### Common error codes

| HTTP | Code | Meaning |
|---|---|---|
| 401 | `UNAUTHENTICATED` | No `Authorization: Bearer` header was sent. |
| 401 | `INVALID_TOKEN` | Token is malformed, expired, or its user no longer exists. Log in again. |
| 401 | `INVALID_CREDENTIALS` | Login email or password is wrong (login only). |
| 403 | `USER_INACTIVE` | The account is deactivated. |
| 403 | `FORBIDDEN` | The caller's role is not allowed on this route. |
| 404 | `RESCUE_NOT_FOUND` | The rescue does not exist, or the caller is not allowed to see it. The API deliberately returns 404 rather than 403 for other organizations' rescues. |
| 404 | `OFFER_NOT_FOUND` | The offer does not exist, or it belongs to another receiver. |
| 404 | `HTTP_ERROR` | Unknown path or method (generic FastAPI error; `message` holds the framework text). |
| 409 | `CLAIM_CONFLICT` | Claim lost to a database lock after 3 attempts. The rescue was taken by another receiver. |
| 409 | `OFFER_NOT_PENDING` | The offer is no longer open (already accepted, declined, timed out or cancelled). |
| 409 | `OFFER_EXPIRED` | The offer's 120-second response window has passed. Another receiver may take it. |
| 409 | `RESCUE_ALREADY_CLAIMED` | Another receiver accepted the rescue first. |
| 409 | `INVALID_STATUS_TRANSITION` | The rescue is not in a state that allows this action (for example, collecting a rescue that is not CLAIMED). |
| 409 | `CANCEL_NOT_ALLOWED` | The donor tried to cancel a rescue that is already CLAIMED or later. |
| 409 | `HANDOFF_NOT_FOUND` | The claimed rescue has no pickup record. Should not occur in normal use. |
| 410 | `PICKUP_CODE_EXPIRED` | The pickup code is past its grace window (`pickup_by` + 60 minutes). |
| 422 | `VALIDATION_ERROR` | Request body or query failed schema validation (see `error.details`). |
| 422 | `NO_FOOD_ITEMS` | A rescue was posted with no food items. |
| 422 | `INVALID_QUANTITY` | A quantity is out of range for the current action (for example, collected servings above the posted total). |
| 422 | `FOOD_NOT_ELIGIBLE` | `served_or_mixed_with_waste` is true or `untouched_confirmed` is false. RescueRelay only redistributes untouched food. |
| 422 | `SAFETY_ATTESTATION_REQUIRED` | `safety_attestation` is false. |
| 422 | `HANDLING_INFO_REQUIRED` | `handling_type` is `UNKNOWN`. The donor must state the holding condition. |
| 422 | `PICKUP_IN_PAST` | `pickup_by` is not in the future. |
| 422 | `PICKUP_BEFORE_PREPARED` | `pickup_by` is not after `prepared_at`. |
| 422 | `CAPACITY_EXCEEDS_MAX` | Receiver capacity `available_servings` is greater than `max_servings`. |
| 422 | `DIETARY_REQUIRED` | Receiver capacity accepts neither vegetarian nor non-vegetarian food. |
| 400 | `PICKUP_CODE_INVALID` | The 4-digit code is wrong. The failed attempt is counted. |
| 429 | `PICKUP_CODE_LOCKED` | Five wrong codes have been entered. The donor must confirm the code. |
| 500 | `INTERNAL_ERROR` | Unexpected server error. The request ID is in the response and the server log. |

Note: there is no `RESCUE_EXPIRED` code. A rescue whose pickup window has ended moves to status `EXPIRED`; an offer that ran out its response window returns `OFFER_EXPIRED`.

## Authentication

1. Log in with `POST /api/v1/auth/login`.
2. Read `data.token` from the response.
3. Send it on every protected request:

```
Authorization: Bearer <token>
```

Tokens are HS256 JWTs signed with `JWT_SECRET`. They expire after `ACCESS_TOKEN_EXPIRE_MINUTES` (default 60). There is no refresh token and **no logout endpoint**: to log out, the client discards the token.

Roles are `DONOR`, `RECEIVER` and `ADMIN`. Each route lists the roles it accepts below.

In Swagger UI, click **Authorize** and paste the token (the `Bearer ` prefix is added by the UI).

## Routes

In the tables below, the Role column lists which signed-in roles may call the route. "none" means no token is needed. Routes that are restricted to the caller's own organization are marked "(own)".

### Health

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/v1/health` | none | Liveness and database check. |

Response `data`: `{ "status": "ok" | "degraded", "database": "ok" | "unavailable" }`

### Auth

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/v1/auth/login` | none | Log in and receive a token. |
| GET | `/api/v1/auth/me` | DONOR, RECEIVER, ADMIN | Current user and organization. |

**POST /auth/login** request body:

| Field | Type | Rules |
|---|---|---|
| `email` | string | Valid email address. Case-insensitive. |
| `password` | string | 1 to 200 characters. |

Response `data`:

| Field | Type | Notes |
|---|---|---|
| `token` | string | Bearer JWT. |
| `token_type` | string | Always `"bearer"`. |
| `user` | object | `id`, `name`, `email`, `role`. |
| `organization` | object | `id`, `name`, `organization_type`, `verification_status`. |

**GET /auth/me** response `data`: `{ "user": {...}, "organization": {...} }` with the same shapes.

### Rescues: donor side

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/v1/rescues` | DONOR | Post surplus food and start matching. |
| GET | `/api/v1/rescues/mine` | DONOR | The donor's 50 most recent rescues. |
| GET | `/api/v1/rescues/{rescue_id}` | DONOR, RECEIVER, ADMIN | Rescue detail, role-filtered. |
| GET | `/api/v1/rescues/{rescue_id}/matches` | DONOR (own), ADMIN | Ranked receivers for the rescue, with reasons. |
| POST | `/api/v1/rescues/{rescue_id}/dispatch` | DONOR (own), ADMIN | Start offering a rescue that is in `MATCHING`. |
| GET | `/api/v1/rescues/{rescue_id}/events` | DONOR, RECEIVER, ADMIN | Status history (visibility rules as for detail). |
| POST | `/api/v1/rescues/{rescue_id}/cancel` | DONOR (own) | Cancel before a claim. |

**POST /rescues** request body (`RescueCreate`):

| Field | Type | Required | Rules and notes |
|---|---|---|---|
| `food_items` | array | yes (at least one) | Each item below. Empty list returns `NO_FOOD_ITEMS`. |
| `food_items[].name` | string | yes | 1 to 160 characters. |
| `food_items[].quantity_servings` | integer | yes | 1 to 100000. |
| `food_items[].dietary_type` | enum | no | `VEG`, `NON_VEG`, `VEGAN`, `OTHER`, `UNKNOWN` (default `UNKNOWN`). |
| `food_items[].allergens` | array of string | no | Up to 20 entries, each 1 to 60 characters. |
| `food_items[].allergen_info_unknown` | boolean | no | Default `false`. When true, the detail view shows an allergen notice. |
| `handling_type` | enum | yes | `HOT_HELD`, `REFRIGERATED`, `ROOM_TEMPERATURE`, `OTHER`, `UNKNOWN`. `UNKNOWN` is rejected. |
| `handling_notes` | string | no | Up to 500 characters. |
| `untouched_confirmed` | boolean | yes | Must be `true`, or the request returns `FOOD_NOT_ELIGIBLE`. |
| `served_or_mixed_with_waste` | boolean | no | Default `false`. Must be `false`. |
| `packaging_available` | boolean | no | Default `false`. |
| `safety_attestation` | boolean | yes | Must be `true`. |
| `prepared_at` | datetime (ISO 8601) | yes | When the food was prepared. Must be before `pickup_by`. |
| `pickup_by` | datetime (ISO 8601) | yes | Must be in the future. This is the deadline. |
| `idempotency_key` | string | yes | 8 to 64 characters. Re-sending the same key for the same donor returns the existing rescue with HTTP 200 and does not re-validate. |
| `latitude` | number | no | -90 to 90. Defaults to the donor organization's coordinates. |
| `longitude` | number | no | -180 to 180. Defaults to the donor organization's coordinates. |
| `locality` | string | no | Up to 200 characters. Defaults to the organization's locality. |
| `private_address` | string | no | Up to 300 characters. Hidden until a receiver claims (see Privacy). Defaults to the organization's address. |

Response: HTTP **201** when created, **200** when the idempotency key matched an existing rescue. `data` is the rescue detail (below). It may also contain `"matching_error": true` if dispatch failed; the rescue is still saved.

**Rescue detail** (`data` from POST, GET detail, dispatch and cancel). Base fields for everyone allowed to see the rescue:

`id`, `display_id`, `status`, `prepared_at`, `pickup_by`, `seconds_remaining`, `handling_type`, `handling_notes`, `packaging_available`, `untouched_confirmed`, `total_servings`, `dietary_type`, `locality`, `food_items[]` (`name`, `quantity_servings`, `dietary_type`, `allergens`, `allergen_info_unknown`), `allergen_notice` (text or null), `safety_notice`, `created_at`.

Extra fields by viewer:

- **Donor (owner) and admin:** `donor_organization_name`, `private_address`, `latitude`, `longitude`, `status_events[]`, `claimed_receiver` (`{name, locality}` or null), `impact` (null, or after delivery `{delivered_servings, rejected_servings, collected_servings, confirmed_kg, minutes_to_delivery}`).
- **Donor (owner) only:** `pickup_code` (4-digit string, shown while status is `CLAIMED` or `COLLECTED`; the admin never sees it).
- **Claiming receiver:** `donor_organization_name`, `private_address`, `latitude`, `longitude`, `donor_phone`, `status_events[]`.
- **Receiver with an offer but no claim:** base fields only, with no address or phone.

**GET /rescues/mine** returns up to 50 rescues, newest first. Each item: `id`, `display_id`, `status`, `pickup_by`, `total_servings`, `created_at`, `locality`, `delivered_servings` (null until delivered).

**GET /rescues/{id}/matches** returns one item per receiver, feasible ones first:

| Field | Notes |
|---|---|
| `receiver_name`, `locality` | Receiver organization. |
| `feasible` | Boolean. |
| `rejection_reasons` | Strings; empty when feasible. |
| `distance_km`, `travel_minutes` | Estimated (see README, Matching). |
| `score` | Weighted score, 4 decimals; 0 when infeasible. |
| `factors` | `proximity`, `urgency`, `need`, `reliability`, `fairness` (each 0 to 1). |
| `why` | Plain-language reasons. |

Calling this route recomputes matching at the current time; it does not create an offer.

**POST /rescues/{id}/dispatch** only works when the rescue is `MATCHING`. Otherwise it returns `INVALID_STATUS_TRANSITION` (409). Returns the rescue detail.

**GET /rescues/{id}/events** returns `[{from_status, to_status, reason, created_at}]` in time order.

**POST /rescues/{id}/cancel** works while the rescue is `POSTED`, `MATCHING` or `OFFERED`. It cancels any pending offer and sets status `CANCELLED`. Returns the rescue detail.

### Offers: receiver side

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/v1/offers/available` | RECEIVER | Open offers for the caller's organization. |
| GET | `/api/v1/offers/history` | RECEIVER | Offers the caller has claimed, newest first. |
| POST | `/api/v1/offers/{offer_id}/claim` | RECEIVER | Accept an offer (atomic). |
| POST | `/api/v1/offers/{offer_id}/decline` | RECEIVER | Decline an offer; the next receiver is offered. |

**GET /offers/available** returns open, unexpired offers. Each item:

`id`, `rescue_id`, `rescue_display_id`, `locality`, `total_servings`, `food_items[]`, `handling_type`, `handling_notes`, `packaging_available`, `untouched_confirmed`, `prepared_at`, `pickup_by`, `seconds_remaining` (until pickup), `expires_at`, `seconds_to_respond` (until the offer lapses; the offer window is 120 seconds by default), `estimated_distance_km`, `estimated_travel_minutes`, `why[]`, `safety_notice`.

The exact address is not included here.

**GET /offers/history** returns the caller's accepted offers, newest claim first. Each item: `offer_id`, `rescue_id`, `rescue_display_id`, `status` (the rescue's current status), `delivered_servings` (null until delivered), `pickup_by`.

**POST /offers/{id}/claim** takes no body. Only one receiver can win; the losers get a 409. Success returns HTTP 200:

| Field | Notes |
|---|---|
| `rescue_id` | |
| `status` | `"CLAIMED"` |
| `offer_id` | |
| `pickup_by` | |

Possible errors: `OFFER_NOT_FOUND` (404), `OFFER_EXPIRED`, `OFFER_NOT_PENDING`, `RESCUE_ALREADY_CLAIMED`, `CLAIM_CONFLICT` (all 409).

**POST /offers/{id}/decline** takes no body. Returns `{offer_id, status: "DECLINED"}`. Errors: `OFFER_NOT_FOUND` (404), `OFFER_NOT_PENDING` (409).

### Pickup and delivery: receiver side

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/v1/rescues/{rescue_id}/collect` | RECEIVER (accepted receiver only) | Collect with the 4-digit pickup code. |
| POST | `/api/v1/rescues/{rescue_id}/deliver` | RECEIVER (accepted receiver only) | Confirm delivered and rejected servings. |

Only the receiver whose offer was accepted may call these; any other receiver gets 404 `RESCUE_NOT_FOUND`.

**POST /rescues/{id}/collect** request body:

| Field | Type | Rules |
|---|---|---|
| `pickup_code` | string | Exactly four digits (`^\d{4}$`). |
| `collected_servings` | integer | 1 to 100000, and not more than the rescue's total. |

Response `data`: `{rescue_id, status: "COLLECTED", collected_servings}`.

Errors: `PICKUP_CODE_INVALID` (400; attempt counted), `PICKUP_CODE_LOCKED` (429, after 5 wrong attempts), `PICKUP_CODE_EXPIRED` (410), `INVALID_STATUS_TRANSITION` (409, rescue not `CLAIMED`), `INVALID_QUANTITY` (422).

**POST /rescues/{id}/deliver** request body:

| Field | Type | Rules |
|---|---|---|
| `delivered_servings` | integer | 0 to 100000. |
| `rejected_servings` | integer | 0 to 100000. |

`delivered_servings + rejected_servings` must not exceed the collected count, otherwise `INVALID_QUANTITY` (422).

Response `data`:

| Field | Notes |
|---|---|
| `rescue_id` | |
| `status` | `"DELIVERED"` |
| `delivered_servings` | |
| `rejected_servings` | Echoes the request body. |
| `impact_meals` | Equal to `delivered_servings`. This is the value that feeds the donor's impact figures. |

The route is idempotent: if the rescue is already `DELIVERED`, the existing impact record is returned and nothing is recorded again.

### Receiver capacity

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/v1/receivers/capacity` | RECEIVER | Read the caller's capacity. Creates a default record if none exists. |
| PUT | `/api/v1/receivers/capacity` | RECEIVER | Replace the caller's capacity settings. |

Both return (and PUT accepts) the same fields:

| Field | Type | Rules |
|---|---|---|
| `available` | boolean | Whether the organization is taking offers. |
| `max_servings` | integer | 0 to 100000. |
| `available_servings` | integer | 0 to 100000. Must not exceed `max_servings`. |
| `accepts_veg` | boolean | At least one of `accepts_veg` / `accepts_non_veg` must be true. |
| `accepts_non_veg` | boolean | |
| `transport_available` | boolean | Receivers without transport are not matched. |
| `need_level` | enum | `LOW`, `MEDIUM`, `HIGH`. |
| `updated_at` | datetime | Read-only in practice; set by the server. |

PUT errors: `CAPACITY_EXCEEDS_MAX` (422), `DIETARY_REQUIRED` (422).

Note: `available_servings` is the value matching checks against the rescue's total. Accepting an offer does not decrement it in the current code.

### Impact

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/v1/impact/summary` | DONOR, ADMIN | Impact figures. Donors see their own rescues; admins see the whole platform. |

Response `data`:

| Field | Notes |
|---|---|
| `total_meals_rescued` | Sum of receiver-confirmed delivered servings in scope. |
| `meals_rescued_month` | The same, for deliveries recorded since the first of the current UTC month. |
| `completed_rescues` | Count of delivered rescues. |
| `completion_rate` | Delivered rescues divided by all rescues in scope, 2 decimals. |
| `avg_completion_minutes` | Average from posting to delivery, or null. |
| `recent_completed[]` | Up to 5 items: `display_id`, `delivered_servings`, `delivered_at`, `receiver_name`. |
| `methodology_note` | `"Meals rescued = receiver-confirmed delivered servings."` |

Receivers have no impact route; calling this returns `FORBIDDEN`.

### Admin (role ADMIN on every route)

| Method | Path | Query | Purpose |
|---|---|---|---|
| GET | `/api/v1/admin/organizations` | `limit` (1 to 100, default 50), `offset` (default 0) | Organizations. |
| GET | `/api/v1/admin/rescues` | `limit`, `offset` | Rescues, newest first. |

Organization items: `id`, `name`, `organization_type`, `verification_status`, `locality`, `reliability`, `created_at`. No private address or phone.

Rescue items: `id`, `display_id`, `status`, `donor_organization_name`, `total_servings`, `pickup_by`, `created_at`.

## Example payloads

These show the shape only. Timestamps must be real ISO 8601 times, with `pickup_by` in the future.

### Create rescue

`POST /api/v1/rescues` with `Authorization: Bearer <donor token>`

```json
{
  "food_items": [
    {
      "name": "Veg Biryani",
      "quantity_servings": 100,
      "dietary_type": "VEG",
      "allergens": ["dairy"],
      "allergen_info_unknown": false
    },
    {
      "name": "Dal",
      "quantity_servings": 40,
      "dietary_type": "VEG",
      "allergens": [],
      "allergen_info_unknown": false
    }
  ],
  "handling_type": "HOT_HELD",
  "handling_notes": "Kept in insulated containers since service.",
  "untouched_confirmed": true,
  "served_or_mixed_with_waste": false,
  "packaging_available": true,
  "safety_attestation": true,
  "prepared_at": "2030-01-01T11:30:00+05:30",
  "pickup_by": "2030-01-01T12:20:00+05:30",
  "idempotency_key": "demo-2030-01-01-biryani-01"
}
```

Abbreviated response (`201`):

```json
{
  "success": true,
  "data": {
    "id": "b3f0...",
    "display_id": "RR-7K2Q9X",
    "status": "OFFERED",
    "total_servings": 140,
    "dietary_type": "VEG",
    "pickup_by": "2030-01-01T06:50:00+00:00",
    "food_items": [ { "name": "Veg Biryani", "...": "..." } ],
    "private_address": "...",
    "donor_organization_name": "Madhapur Grand Events",
    "pickup_code": null
  },
  "request_id": "..."
}
```

Real responses also include the other detail fields listed above. `status` is `OFFERED` when an offer was sent, or `MATCHING` when no feasible receiver was found yet.

### Claim

`POST /api/v1/offers/{offer_id}/claim` with `Authorization: Bearer <receiver token>`. No body.

```json
{
  "success": true,
  "data": {
    "rescue_id": "b3f0...",
    "status": "CLAIMED",
    "offer_id": "7a1c...",
    "pickup_by": "2030-01-01T06:50:00+00:00"
  },
  "request_id": "..."
}
```

### Collect

`POST /api/v1/rescues/{rescue_id}/collect` with the receiver token.

```json
{
  "pickup_code": "4831",
  "collected_servings": 140
}
```

```json
{
  "success": true,
  "data": {
    "rescue_id": "b3f0...",
    "status": "COLLECTED",
    "collected_servings": 140
  },
  "request_id": "..."
}
```

### Deliver

`POST /api/v1/rescues/{rescue_id}/deliver` with the receiver token.

```json
{
  "delivered_servings": 132,
  "rejected_servings": 8
}
```

```json
{
  "success": true,
  "data": {
    "rescue_id": "b3f0...",
    "status": "DELIVERED",
    "delivered_servings": 132,
    "rejected_servings": 8,
    "impact_meals": 132
  },
  "request_id": "..."
}
```

The pickup code `4831` above is only an example; the real code is generated at claim time and shown to the donor on the rescue detail.

## Rescue status values

`POSTED` → `MATCHING` → `OFFERED` → `CLAIMED` → `COLLECTED` → `DELIVERED`, with side exits to `EXPIRED` (uncollected food past pickup-by) and `CANCELLED` (donor cancelled before collection). Receiver release can return `CLAIMED` to `MATCHING` while time remains. See `docs/ARCHITECTURE.md` for the state machine.

Offer status values: `PENDING`, `ACCEPTED`, `DECLINED`, `TIMED_OUT`, `CANCELLED`.

## Cancellation and recognition

`POST /rescues/{id}/cancel` now requires `{ "reason": "Food no longer available" }`. Only the owning donor can cancel, before collection.

`POST /rescues/{id}/release` requires `{ "reason": "Transport unavailable" }`. Only the assigned receiver can release a CLAIMED pickup. Capacity is freed, the previous code is invalidated and matching resumes until the deadline. Its historical offer remains DECLINED with a claimed timestamp. Chat messages are scoped to the accepted offer so replacement receivers cannot read old handoff conversations.

`GET /rescues/{id}/rating` returns the current participant's saved handoff stars or null; `POST` updates them after delivery.

| Recognition endpoint | Access / response |
|---|---|
| `GET /rescues/{id}/recognition` | Donor/actual receiver; issued or withdrawn acknowledgement, or null. |
| `POST /rescues/{id}/recognition` | Actual receiver after positive delivery; requires publication consent. |
| `POST /rescues/{id}/recognition/withdraw` | Issuing receiver; disables public verification. |
| `GET /recognition/mine` | Donor/receiver; latest 100 acknowledgements in own scope. |
| `GET /recognition/verify/{token}` | Public allowlisted record; 404 for unknown/withdrawn/replaced tokens. |

Example issue body:

```json
{"people_served":100,"food_rating":4,"message":"Thank you for supporting our kitchen.","consent_to_publish":true}
```

People served and food rating may be null. People must be a positive integer no greater than delivered meals. Ratings are 1–5 receiver opinions. Messages are limited to 280 characters. An issued record is immutable; identical retries succeed, different details require withdrawal then reissue. Reissue rotates the verification token. The public record contains organization names, delivery totals, dates and explicitly approved feedback, never addresses, contacts, user identities or pickup credentials.

Impact summary adds reported people, count coverage, food feedback average/sample size, appreciation count, collected/rejected/unallocated servings, utilization and partner count. Reported recipients are not deduplicated across donations.
# Contribution and private allocation

- `GET /api/v1/contribution`: donor/receiver organization-scoped lifetime coins, medals, next milestone, weekly streak, impact summary and latest 100 coin activity rows. No client-supplied balance and no coin mutation endpoint.
- `GET /api/v1/receiver/planner`: receiver's latest 100 COLLECTED/DELIVERED batches.
- `GET /api/v1/receiver/planner/{rescue_id}`: private group draft, current revision, actual serving ceiling, food/handling data and `needs_revision`.
- `PUT /api/v1/receiver/planner/{rescue_id}`: `{revision, handling_reviewed: true, groups: [{name, people, servings, dietary_notes}]}`. Maximum 20 groups. Whole positive people and nonnegative servings; distinct nonblank names; allocations cannot exceed actual quantity. Returns 409 for stale revisions and 422 for invalid plans. Does not create delivery impact.
- Leaderboard entries additionally return `kindness_coins` and `contribution_medal`, separately from trust badges.
