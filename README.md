# RescueRelay

**Codebenders ACE Builders’ Hackathon 2026 · Problem Statement 2 · Society and Environment**

RescueRelay coordinates time-sensitive surplus food donations in Hyderabad. Caterers and event venues post untouched surplus, nearby community kitchens and shelters claim compatible donations, and both sides track the pickup through confirmed delivery. The app records actual delivered servings and explains how it estimates food weight and climate impact.

**Judging the project?** Start with the scoring guide and live walkthrough. [Hackathon judge guide](JUDGE_GUIDE.md)

## The problem

At the end of an event, a caterer needs to find a receiver before the pickup deadline. The receiver needs to know whether the food fits its dietary requirements, available capacity, storage and transport. A phone call can arrange a pickup, but it leaves those checks and delivery confirmation spread across conversations. RescueRelay keeps those decisions and the handoff record on one listing.

| User | What they do in RescueRelay |
| --- | --- |
| **Donor** | Post surplus, check matches, coordinate supplies, share the pickup code and review delivery outcomes. |
| **Receiver** | Set capacity and food preferences, find compatible offers, claim a pickup and report delivered and rejected servings. |
| **Coordinator** | Review partner status, monitor rescue activity, manage the logistics provider directory and issue appreciation certificates for confirmed deliveries. |

## How a rescue works

1. **Post.** Enter food items and quantities, dietary and allergen details, holding conditions and preparation time. Smart paste can prefill fields for review. The app computes a consume-by estimate using editable, unverified hold-time defaults and caps pickup to leave time for delivery.
2. **Match and dispatch.** The backend checks eligibility and scores compatible receivers. Priority offers rotate on expiry or decline, while eligible receivers can also claim through the discovery feed. At 40% of the pickup window, an unclaimed listing widens its search from 15 km to 25 km and can trigger in-app notifications. At 70%, it is marked urgent.
3. **Claim and collect.** A successful claim reserves capacity and reveals the exact pickup address to the assigned receiver. The receiver checks in, confirms logistics and pickup checks, enters the donor’s four-digit code, and records the collected quantity. A missed check-in releases the claim and reopens matching while time remains.
4. **Deliver and report.** The receiver records delivered and rejected quantities. Only confirmed delivered servings count toward meal impact. The donor can open a shareable event report for that delivery. Status updates appear in the rescue timeline.

**Lifecycle** · Posted → Matching → Offered → Claimed → Collected → Delivered. A listing can also be cancelled or expire, and a released claim can return to matching.

## Features by area

| Area | What the demo supports |
| --- | --- |
| Donor operations | Mobile-friendly posting wizard, draft recovery, rule-based smart paste, repeat-last listing, weekly templates, event-end reminders and rescue history. |
| Receiver operations | Capacity and food preferences, map and list discovery, explainable matches, pickup logistics, handoff chat, delivery tracking and private group allocation plans with CSV packing lists. |
| Dispatch and oversight | Background offer expiry and reassignment, one-time spoilage escalation, admin rescue and partner views, logistics directory and an optional fast-forward demo clock. |
| Allocation | Donors can estimate portions for multiple eligible receivers and send proposals in Messages. Receivers can plan distribution after collection. A standard claim reserves the full posting. |
| Impact and appreciation | Community and role-specific impact views, donor CSV, address-free event reports, browser PDF export, optional feedback, appreciation posters and non-cash recognition milestones. |
| Business pack | Pricing and donor ROI, sponsor pledges and sample impact, a neighbourhood coverage heatmap, editable unit economics and a separate page for real pilot conversation notes. |

## Technology and architecture

The React frontend calls the FastAPI REST API under `/api/v1`. The API applies access rules, runs matching and handoff logic, and writes operational records to SQL. A separate dispatch worker uses the same services and database for unattended offer rotation and escalation. The frontend polls for updates.

| Layer | Tools and responsibilities |
| --- | --- |
| Frontend | React 18, TypeScript and Vite. Tailwind CSS for responsive UI, React Router for role-based routes and TanStack Query for API state and polling. |
| Maps and charts | Leaflet and React Leaflet for map views. Recharts for trend and impact charts. |
| API and access | Python 3.11+, FastAPI, Uvicorn and Pydantic v2. JWT sessions, bcrypt password hashing and server-side role and organization checks. |
| Persistence | SQLAlchemy 2 and Alembic. SQLite for the local demo. PostgreSQL, including Neon configuration, is supported. |
| Background processing | The dispatch worker evaluates expired offers, unclaimed listings and missed check-ins. A shared demo clock can advance the timeline in an isolated synthetic database. |
| Verification | Pytest and FastAPI TestClient on the backend. Vitest and Testing Library on the frontend. Docker Compose provides an optional PostgreSQL stack. |

The core data model links organizations and users to rescues, food items, offers, handoffs, status events and impact records. Matching first filters by capacity, food compatibility, timing and other eligibility constraints. It then ranks feasible receivers by proximity (35%), urgency (30%), need (20%), reliability (10%) and fairness (5%).

### Repository map

| Path | Contents |
| --- | --- |
| `frontend/src/app/` | Routes and role gates |
| `frontend/src/pages/` and `frontend/src/components/` | Workflows, dashboards and shared UI |
| `backend/app/api/` | API routes and authentication dependencies |
| `backend/app/services/` and `backend/app/models/` | Dispatch, matching, handoff, impact and persistence models |
| `backend/alembic/` and `backend/app/seed/` | Database migrations and synthetic demo setup |
| `backend/tests/` and `frontend/src/tests/` | API, service and UI regression tests |

## Run the local demo

Use Python 3.11+ and Node.js 20.19+ on the 20.x line or 22.12+. The commands below use Windows PowerShell and a dedicated synthetic database, `backend/data/hackathon-demo.db`. Run the API and worker in separate terminals. Use the same database settings in both.

**Backend** · From the repository root

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:DATABASE_TARGET = "local"
$env:DATABASE_URL = "sqlite:///./data/hackathon-demo.db"
$env:DEMO_MODE = "true"
$env:DEMO_CLOCK_ENABLED = "false"
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed.init_db
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

**Dispatch worker** · In a second terminal, from `backend`

```powershell
$env:DATABASE_TARGET = "local"
$env:DATABASE_URL = "sqlite:///./data/hackathon-demo.db"
$env:DEMO_MODE = "true"
$env:DEMO_CLOCK_ENABLED = "false"
.\.venv\Scripts\python.exe -m app.workers.dispatch_worker
```

**Frontend** · In a third terminal, from `frontend`

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the app at [localhost:5173/home](http://localhost:5173/home). The API reference runs at [localhost:8000/docs](http://localhost:8000/docs). This setup uses available ports 5173 and 8000. The Vite proxy defaults to the local API on port 8000.

All demo accounts use the synthetic password `demo123`.

| Role | Demo email |
| --- | --- |
| Donor | `donor@rescuerelay.demo` |
| Receiver | `hope@rescuerelay.demo` |
| Admin | `admin@rescuerelay.demo` |

For the shared team snapshot, existing databases, Docker, other shells, and clock setup, see the run and database guides. [Runbook](HOW_TO_RUN.md) · [Shared SQLite snapshot](docs/SHARED_DATABASE.md) · [Neon setup](docs/NEON_DATABASE.md)

## Impact, privacy and demo scope

- **Impact math.** One confirmed delivered serving counts as one meal. Estimated weight is meals × 0.4 kg. Estimated CO₂e is estimated food weight × 2.5 kg CO₂e per kg of food. A confirmed delivery of 38 servings reports 38 meals, approximately 15.2 kg of food and 38 kg CO₂e on this illustrative model.
- **Privacy and handling checks.** Demo data is synthetic. Exact pickup addresses are restricted to confirmed handoffs. Event reports shared by link exclude addresses and show only receiving organization names. Hold-time defaults are unverified. The **Verified (ID checked)** badge refers to an admin identity check. Certificates acknowledge contributions only. **Not a food-safety certification.**
- **Demo boundaries.** Donor templates, reminders, demo pledges and pilot notes use browser storage. Alerts are in-app. Travel times are approximations. Public report links generated on localhost can be opened on the machine running the demo. Pricing, sponsor outcomes and unit economics are illustrative. Billing is inactive.

## Tests and further reading

Run `python -m pytest` from `backend` using the project’s Python environment. Run `npm test` and `npm run build` from `frontend` (use `npm.cmd` where required in PowerShell). Coverage includes matching, claim concurrency, handoff integrity, deadline escalation, access control, public event report fields and pickup UI transitions.

- [Judge guide and demo walkthrough](JUDGE_GUIDE.md)
- [User guide](docs/USER_GUIDE.md)
- [Architecture notes](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Contribution and allocation planning](docs/CONTRIBUTION_AND_PLANNER.md)
