# RescueRelay

**Surplus food has a deadline. RescueRelay beats it.**

RescueRelay is a food-rescue coordination platform for Hyderabad. Caterers and event kitchens post surplus cooked food; the platform ranks the community kitchens, NGOs and shelters that can feasibly take it, offers it to one receiver at a time, and records what was actually delivered.

## Problem

Caterers and event kitchens often end up with surplus cooked food that is still fit to serve but has no fast route to people who need it. Phone calls and group chats are slow. Receivers cannot see what is available before it spoils. Nobody records what was delivered, so the impact is invisible.

## Solution

- **Donors** (caterers) post a rescue: food items with quantities, handling information, a pickup deadline (`pickup_by`) and their own attestations.
- **Matching** filters out receivers that cannot feasibly take the rescue, then ranks the rest with a fixed weighted score.
- **Dispatch** offers the rescue to the top receiver. If it is declined or not answered within 120 seconds, the next receiver is offered.
- **Claim** is atomic: the first receiver to accept gets the rescue. The donor then sees a 4-digit pickup code.
- **Collect and deliver** are recorded by the receiver. The receiver confirms how many servings were delivered and how many were rejected.
- **Impact** counts only those receiver-confirmed delivered servings.

## Key features

- Donor posting with food items, dietary and allergen fields, handling type, untouched and packaging confirmation.
- A **Rescue Clock** on the rescue page that counts down to `pickup_by`.
- A matching explanation that shows each receiver, whether it is feasible, and why.
- Receiver inbox of open offers, with a response countdown, and an offer history.
- Receiver capacity settings: available servings, maximum capacity, vegetarian and non-vegetarian acceptance, transport, and need level.
- Pickup-code collection, delivery confirmation, and a donor impact page.
- Admin read-only views of organizations and rescues. Admin views never show private contact or address fields.
- Role-based access for donors, receivers and admins.

## Architecture

RescueRelay has a FastAPI backend with a SQLAlchemy 2 data layer, and a React + Vite + TypeScript frontend. The backend uses SQLite by default and PostgreSQL when `DATABASE_URL` is set.

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the components, the rescue state machine and the dispatch flow.

Other key files:

- `backend/app/api/` - route modules (`routes_*.py`) and the `/api/v1` router.
- `backend/app/services/` - matching, dispatch, pickup, rescue and impact logic.
- `backend/app/seed/` - demo seed and reset commands.
- `backend/alembic/` - database migrations.
- `frontend/src/app/App.tsx` - screen routes.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2, Alembic, Pydantic 2 |
| Auth | JWT (HS256, PyJWT), bcrypt password hashing |
| Database | SQLite (default, local file), PostgreSQL 16 (Docker compose or external) |
| Frontend | React 18, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS |
| Tests | pytest (backend), Vitest and Testing Library (frontend) |
| Containers | Docker and docker-compose (optional; see Known limitations) |

## Matching

Matching is deterministic and rule-based. No model or external service is involved. The code is in `backend/app/services/matching_service.py` and `backend/app/services/geo.py`.

### 1. Feasibility filter (hard rules)

A receiver is only considered if **all** of these hold. Each failed rule is returned as a rejection reason:

1. The receiver is `VERIFIED`.
2. The organization type is not `CATERER` or `ADMIN` (those cannot receive food).
3. The receiver is currently available.
4. `available_servings` is at least the rescue's `total_servings`.
5. If the rescue contains non-vegetarian food, the receiver accepts non-vegetarian food. Otherwise the receiver accepts vegetarian food.
6. The receiver has transport available.
7. The receiver can reach the donor and the rescue still has slack before `pickup_by`: `slack = minutes_to_pickup - travel_minutes - MATCHING_SAFETY_BUFFER_MINUTES` must not be negative.

The donor's own organization is never a candidate.

### 2. Distance and travel time

- **Straight-line distance:** haversine formula on a sphere with radius `EARTH_RADIUS_KM = 6371.0`.
- **Road distance:** straight-line distance × `ROAD_FACTOR = 1.4`.
- **Travel time:** road distance ÷ `AVERAGE_SPEED_KMH = 20.0`, × 60 for minutes.
- **Safety buffer:** `MATCHING_SAFETY_BUFFER_MINUTES`, default **10** (config).

These are approximations. There is no live traffic or routing service.

### 3. Weighted score (feasible receivers only)

| Factor | Weight | Definition in code |
|---|---|---|
| Proximity | 0.35 | `max(0, 1 - road_km / 15)`, where 15 km is `PROXIMITY_HORIZON_KM` |
| Urgency | 0.30 | `clamp(slack_minutes / 120)`, where 120 is `URGENCY_HORIZON_MINUTES` |
| Need | 0.20 | HIGH = 1.0, MEDIUM = 0.6, LOW = 0.3 |
| Reliability | 0.10 | The organization's reliability value, clamped to 0 to 1 |
| Fairness | 0.05 | `1 / (1 + completed deliveries in the last 24 hours)` |

Score = sum of weight × factor, rounded to 4 decimals. Ties are broken by shorter travel time, then receiver name.

Weights are `WEIGHTS` in `matching_service.py`. They are fixed in code, not per-organization.

## Dispatch and claim

- **One open offer at a time.** A rescue has at most one `PENDING` offer.
- **Response window:** **120 seconds** by default (`DISPATCH_OFFER_TIMEOUT_SECONDS`).
- **Next receiver:** when an offer is declined or times out, matching is re-run and the best feasible receiver that has not yet been offered this rescue gets it.
- **Atomic claim:** claiming first flips the offer from `PENDING` to `ACCEPTED` only if it is still pending and unexpired. It then flips the rescue from `OFFERED` to `CLAIMED` only if it is still `OFFERED`. Other pending offers for the rescue are cancelled. The losing requests get `409`.
- **One accepted offer per rescue:** enforced at the database level by a partial unique index (migration `0002_one_accepted_offer_per_rescue`).
- **Expiry:** expired offers are processed when offers or rescue details are read. The optional worker `python -m app.workers.dispatch_worker` also processes them.

## Impact methodology

**Meals rescued = receiver-confirmed delivered servings.**

- Impact is recorded only when a receiver confirms delivery (`POST /api/v1/rescues/{id}/deliver`).
- The posted quantity is not counted. Servings that were rejected or not delivered are not counted.
- The figure is cumulative for the donor (`GET /api/v1/impact/summary`), with a monthly subtotal.
- Weight in kilograms is not recorded in the current build (`confirmed_kg` is null).

## Safety and limitations

RescueRelay coordinates food recovery and does not certify food safety. Handling information is provided by the donor. Receiving organizations are responsible for verifying suitability.

In the app, the donor's handling attestation is required before posting, and receivers see a safety notice with every offer. These are records of what the donor stated. They are not a food-safety inspection.

## Privacy

- The donor's exact address, latitude and longitude are **hidden until a receiver claims the rescue**. Before a claim, receivers see the locality and the food details only.
- After a claim, the claiming receiver can see the donor's address, coordinates and phone number.
- The pickup code is shown only to the donor who posted the rescue, and only while the rescue is CLAIMED or COLLECTED. Admins never see it.
- Admin list views (`/api/v1/admin/organizations`, `/api/v1/admin/rescues`) do not include private contact or address fields.
- Passwords are stored as bcrypt hashes. Pickup codes are stored as bcrypt hashes, plus an encrypted copy for the donor.

## Demo credentials

**Demo only. These accounts exist in the seed data for demonstration and must not be used in any real deployment.**

Password for every demo account: `demo123`

| Email | Role | Organization |
|---|---|---|
| donor@rescuerelay.demo | donor | Madhapur Grand Events |
| hope@rescuerelay.demo | receiver | Hope Community Kitchen |
| shelter@rescuerelay.demo | receiver | ShelterServe |
| cityfood@rescuerelay.demo | receiver | City Food Relief |
| admin@rescuerelay.demo | admin | RescueRelay Admin |

All names, addresses and phone numbers in the seed data are fictional.

## Running it

See **[HOW_TO_RUN.md](HOW_TO_RUN.md)** for setup, the demo accounts and troubleshooting.

Quick start, backend (from `backend/`, with the virtual environment active):

```powershell
alembic upgrade head
python -m app.seed.init_db
python -m uvicorn app.main:app --reload --port 8000
```

Frontend (from `frontend/`):

```powershell
npm install
npm run dev
```

## Documentation

- **[HOW_TO_RUN.md](HOW_TO_RUN.md)**: setup, commands, troubleshooting, production notes.
- **[docs/API.md](docs/API.md)**: every route, role, request and response field, and error code.
- **[docs/DEMO.md](docs/DEMO.md)**: the 2-minute donor-to-impact demo script.
- **[docs/BUSINESS.md](docs/BUSINESS.md)**: target customers and the pricing and payer hypotheses. Hypotheses only.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**: components and the rescue state machine.
- **Swagger UI**: http://localhost:8000/docs while the backend is running.

## Testing

Backend (from `backend/`):

```powershell
python -m pytest -q
```

Tests use their own SQLite file, `backend/data/_pytest.db`, and do not touch the demo database. When `TEST_DATABASE_URL` is set, the tests use that PostgreSQL database instead; it is selected by `TEST_DATABASE_URL` alone.

PostgreSQL verification: the backend suite passed 41 tests on SQLite and 41 tests on local PostgreSQL 17 (127.0.0.1:5433, database `rescuerelay_test`) via `TEST_DATABASE_URL`. Alembic `upgrade head` works on PostgreSQL and SQLite, and the seed `init_db` works on PostgreSQL. The test database must be dedicated, because the tests drop and recreate its tables. Setup steps are in [HOW_TO_RUN.md](HOW_TO_RUN.md).

Frontend (from `frontend/`):

```powershell
npx vitest run
npx tsc --noEmit
npm run build
```

There is no end-to-end (browser) test suite. The manual steps in [docs/DEMO.md](docs/DEMO.md) are the end-to-end check.

## Known limitations

- Backend tests pass on both SQLite (default) and a local PostgreSQL 17 database selected with `TEST_DATABASE_URL`; Docker Compose and the Dockerfiles are not verified in this environment.
- **Docker compose is not verified end to end.** The compose file and Dockerfiles are written, but they have not been run in the build environment because Docker was not installed there.
- **AI parser not implemented.** The `AI_ENABLED`, `AI_API_KEY` and `AI_MODEL` settings exist, but there is no AI code path. Food items are entered by hand.
- **No real routing API.** Distances are straight-line × 1.4 and travel time assumes 20 km/h. Real road times will differ.
- **Reliability scores are synthetic.** The reliability values for demo organizations are placeholders, not measured performance.
- **No end-to-end test suite.** Frontend checks are unit and type checks only.
- **Capacity is not decremented on claim.** `available_servings` is set by the receiver and is not reduced when an offer is accepted.

## Roadmap

1. Verify the Docker compose stack end to end on a machine with Docker.
2. Add a browser end-to-end test that runs the demo script.
3. Replace straight-line road estimates with a routing service.
4. Decrement receiver capacity on claim and release it on delivery or cancellation.
5. Pilot with a small number of Hyderabad caterers and receivers, and measure real delivery times.

## Screenshots

_Screenshots to be added after the demo is recorded:_

- [ ] Donor: post a rescue (`/donor/rescue/new`)
- [ ] Donor: rescue detail with Rescue Clock and matching explanation (`/donor/rescue/<id>`)
- [ ] Receiver: open offer (`/receiver`)
- [ ] Receiver: pickup and delivery (`/receiver/pickup/<rescue_id>`)
- [ ] Donor: impact (`/donor/impact`)
