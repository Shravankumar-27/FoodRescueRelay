# Food Rescue Relay

**Rescue good food. Relay it to your community.**

> A time-sensitive food recovery platform connecting event caterers with nearby community kitchens and NGOs.

| Project link | Add before submission |
| --- | --- |
| **Live application** | <https://rescuerelay-ui.onrender.com/> |
| **Demo video** | Video Demo.mp4 |

## Overview

Food Rescue Relay helps move suitable surplus food to nearby organizations that can use it. Donors publish a short-lived listing with quantity, dietary, allergen, handling and pickup information. Receivers discover compatible listings, coordinate collection, confirm the handoff and report delivered quantities. Both sides can follow the same status timeline and review the recorded community impact.

The project is built for an international social-impact challenge, with a focused pilot scenario: **event caterers and community kitchens in Hyderabad, India**. The pilot is intentionally narrow so the first donor flow, receiver needs and pickup distances can be demonstrated clearly. The underlying workflows are designed to adapt to other cities and donor types.

## The problem

Food left after events can be difficult to redistribute quickly. A donor may not know which nearby organization can accept the quantity, dietary type or pickup time. A receiver may not know enough about the food or logistics to decide whether to collect it. Calls and informal messages also make the final handoff and delivered quantity difficult to track.

Food Rescue Relay gives both partners one listing, a matching and coordination flow, and a delivery record. It supports coordination; **it does not inspect food or certify that food is safe**.

## Sign in and explore the demo

Open the deployed application placeholder above, then choose **Sign in**. The login page lists demo accounts by workspace. Selecting an account fills its email and password into the form; press **Sign in** to open that role’s dashboard. You can also sign in with the credentials below.

| Workspace | Demo account | Password |
| --- | --- | --- |
| Donor | `donor@rescuerelay.demo` | `demo123` |
| Receiver — Hope Community Kitchen | `hope@rescuerelay.demo` | `demo123` |
| Receiver — ShelterServe | `shelter@rescuerelay.demo` | `demo123` |
| Receiver — City Food Relief | `cityfood@rescuerelay.demo` | `demo123` |
| Admin | `admin@rescuerelay.demo` | `demo123` |

The landing page also has shortcuts that preselect donor, receiver or admin demo accounts. On a user’s first login, a role-specific guided tour introduces the workspace; the tour can be started again from the app. To demonstrate a complete handoff, keep the donor and receiver signed in through **separate browser profiles or browsers**. Signing into another role in the same browser replaces the current session.

All listed accounts and records are synthetic. Do not enter real personal data or real pickup addresses into the demo.

## Product workflows

### Donor

1. Create a listing with food, servings, category, dietary type, allergens, preparation time, handling and a pickup deadline.
2. Use smart paste to prefill a draft if useful, then review and correct the fields before posting.
3. Review suitable nearby receiver organizations and the reasons they match. The donor map shows receivers only.
4. Coordinate collection with a claimed receiver using the rescue page and suggested-message chat.
5. Follow the handoff through collection and delivery, then review confirmed meals, impact estimates, contribution coins and appreciation artwork.

The donor workspace also includes draft recovery, repeat-listing tools, templates, event reminders, active rescues, history and exports.

### Receiver

1. Set current capacity, dietary and food preferences, excluded allergens, refrigeration and transport details.
2. Browse compatible donor listings in a map or list. The receiver map shows donors only; locations are approximate before a claim.
3. Claim a listing only when the food and pickup window fit the organization’s needs.
4. Coordinate the pickup, complete the handoff checks, enter the donor’s pickup code and record the quantity collected.
5. After distribution, report delivered and rejected servings separately.
6. Use the allocation planner to divide a collected batch among groups and export a packing-list CSV.

The receiver workspace also includes pickup history, impact, recognition and contribution views. Planned allocation groups are not a verified list of recipients.

### Admin and business proposal

The admin workspace summarizes rescue statuses, delivered meals, weekly outcomes and partners awaiting review. Admin pages support organization identity checks, rescue monitoring and appreciation review. An identity-check badge does not indicate food-safety approval.

The app also includes a **proposed** business pack: donor pricing and ROI assumptions, sample neighbourhood sponsorship, a city coverage view, editable unit economics and a pilot-feedback area. These pages use illustrative data. Receiving remains free in the proposal; billing is not implemented and no willingness-to-pay research is represented as completed.

## Matching and handoff

Matching is deterministic and rule-based. It excludes receivers that do not meet eligibility requirements such as capacity, dietary fit, allergen restrictions, storage, transport or estimated arrival time. Feasible candidates are ranked by:

| Factor | Weight |
| --- | ---: |
| Proximity | 35% |
| Pickup urgency | 30% |
| Reported need | 20% |
| Reliability | 10% |
| Fair allocation | 5% |

The main handoff statuses are **Posted → Matching → Offered → Claimed → Collected → Delivered**. Listings may also be cancelled or expire. A collected listing remains in progress until delivery is recorded. A short pickup code helps confirm collection; it is not a safety inspection.

The codebase includes a dispatch worker for periodic offer expiry, reassignment and escalation. **The current Render Blueprint does not deploy a separate worker**, so continuous background processing requires a separately hosted worker. Relevant API request paths also process some expired-offer and pickup conditions when users open or act on a rescue.

## Impact, trust and recognition

Impact is calculated from confirmed delivered servings, not posted or claimed food. The demo’s illustrative model is:

- **Meals:** one confirmed delivered serving counts as one meal.
- **Estimated food weight:** meals × 0.4 kg per meal.
- **Estimated CO₂e:** estimated food weight × 2.5 kg CO₂e per kg of food.

For example, 38 confirmed meals are modeled as 15.2 kg of food and 38 kg CO₂e. This is an estimate based on stated assumptions, not a direct measurement of landfill diversion or emissions. The model does not include transport emissions.

Partners can build a history of completed handoffs and receiver/donor feedback. Community rankings use confirmed meals and trust signals. Both donors and receivers can earn contribution coins and milestone medals from delivered meals. Coins have no cash value and do not affect access to food or matching priority. Per-delivery and overall appreciation posters are designed for sharing; they are appreciation records, not endorsements, certificates of food safety, tax receipts or CSR credits.

## Safety, privacy and demo boundaries

- Donors provide food, preparation, allergen and handling details. Receivers decide whether food is suitable for their organization before accepting and distributing it.
- Hold-time and consume-by values are planning estimates, not food-safety advice or guarantees.
- Exact pickup information is restricted until a receiver claims the handoff. Public event reports omit pickup addresses.
- All included organizations, people, locations and activity are synthetic demo data.
- Pricing, sponsor outcomes, coverage estimates and unit economics are illustrative; payments are inactive.
- The project makes no promise of tax, legal or regulatory benefits.

## Technology and architecture

```text
React / TypeScript browser app
            │ HTTPS · REST / JSON
            ▼
FastAPI API · /api/v1
            │ authorization · validation
            ▼
SQLAlchemy services
matching · dispatch · pickup · impact · trust · rewards
            │
            ▼
SQLite (local)     PostgreSQL / Neon (hosted)
```

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router and TanStack Query. Leaflet supports maps; Recharts supports impact charts.
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2 and Alembic. Authentication uses JWT sessions and bcrypt password hashing; API routes enforce role and organization access.
- **Matching:** Fixed, explainable rules. No LLM or LangGraph workflow is used; smart paste is rule-based.
- **Testing:** Pytest and FastAPI TestClient on the backend; Vitest and Testing Library on the frontend.

## Neon database and Render deployment

The deployed API stores organizations, accounts, listings, offers, handoffs, messages, impact and recognition records in **Neon PostgreSQL**. The browser talks to the API and never receives database credentials. Neon keeps application data separate from Render’s temporary service filesystem.

The backend service uses `DATABASE_TARGET=neon` and the private `NEON_DATABASE_URL` connection string. An optional `NEON_DIRECT_DATABASE_URL` can be used for migrations; otherwise the pooled connection is used. Keep these values in Render environment settings and never commit them to the repository or expose them through frontend variables.

The backend container runs `alembic upgrade head` before starting the API, then initializes synthetic demo records when `DEMO_MODE=true`. Migrations update the schema while preserving existing records. Back up or branch the Neon database before making manual schema changes.

`render.yaml` defines a Render Blueprint with a Docker API service and a static React site. The static site rewrites application routes to `index.html` for browser refreshes on routes such as `/home` and `/donor`. Configure the Neon URL in Render when creating the Blueprint; the Blueprint generates a JWT secret and connects the frontend service to the API service. Free Render web services can sleep when idle, so the first request may take longer to respond. See [Render Blueprint documentation](https://render.com/docs/blueprint-spec), [Render free service limits](https://render.com/docs/free) and [Render’s Docker guide](https://render.com/docs/docker).

## Run locally

Prerequisites: Python 3.11+, Node.js 20.19+ or 22.12+, and npm. The commands below use Windows PowerShell. Start the backend API and frontend in separate terminals.

### 1. Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
$env:DATABASE_TARGET = "local"
$env:DATABASE_URL = "sqlite:///./data/hackathon-demo.db"
$env:DEMO_MODE = "true"
$env:DEMO_CLOCK_ENABLED = "false"
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed.init_db
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

### 2. Start the frontend

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open [http://localhost:5173/home](http://localhost:5173/home). The API reference is at [http://localhost:8000/docs](http://localhost:8000/docs).

### Optional: run with Docker Compose

From the repository root, copy `.env.example` to `.env`, set a local `JWT_SECRET` of at least 32 characters, then run:

```powershell
docker compose up --build
```

Compose starts PostgreSQL, applies migrations and seeds synthetic data through the backend container, then serves the frontend at `http://localhost:5173/home`. The demo database credentials in `.env.example` are for local development only.

## Tests and build

The backend runtime dependencies are in `backend/requirements.txt`; development and test dependencies are in `backend/requirements-dev.txt`. The Docker image installs only runtime dependencies.

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
cd ..\frontend
npm.cmd test
npm.cmd run build
```

## Repository layout

| Path | Purpose |
| --- | --- |
| `frontend/src/app/` | Routes and role access guards |
| `frontend/src/pages/` | Public, donor, receiver, admin and business pages |
| `frontend/src/components/` | Shared maps, chat, impact, navigation and UI |
| `backend/app/api/` | Versioned API routes and access checks |
| `backend/app/services/` | Matching, dispatch, pickup, impact, trust and rewards |
| `backend/app/models/` | Persistent data model |
| `backend/alembic/versions/` | Ordered database migrations |
| `backend/app/seed/` | Repeatable synthetic demo data setup |
| `backend/tests/`, `frontend/src/tests/` | Backend and frontend tests |
| `render.yaml`, `docker-compose.yml` | Hosted and local container deployment configuration |

For a feature-by-feature explanation and a donor-to-receiver walkthrough, see the [Project Guide](PROJECT_GUIDE.md).
