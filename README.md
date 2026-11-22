# RescueRelay — Rescue the Surplus

> **Codebenders ACE Builders' Hackathon 2026 · Problem Statement 2: Society and Environment**

A platform that connects surplus food from caterers, event venues, and restaurants to NGOs, community kitchens, and shelters in Hyderabad — within a short time window, with full traceability.

---

## 🍽️ Problem

India wastes an estimated **68.7 million tonnes** of food per year. Catering events routinely have 20–40% surplus. Meanwhile, millions go hungry. The gap isn't food — it's **coordination, trust, and speed**.

## ✅ Solution

RescueRelay is a web platform (mobile-first PWA) that:
1. Lets donors post surplus in **under 60 seconds**
2. **Smart-matches** the nearest eligible receiver by distance, capacity, timing, and need
3. Coordinates **pickup with live status** (Posted → Matching → Offered → Claimed → Collected → Delivered)
4. Shows **transparent impact** (meals rescued, CO₂e avoided) with assumptions one click away
5. Enforces **food safety guardrails** — mandatory handling info, safety attestation, and receiver checklist

> **City focus**: Hyderabad, Telangana. Donor type: caterers and wedding/event venues.

---

## 🏗️ Architecture

```
frontend/          React 18 · TypeScript · Vite · TailwindCSS 3
  src/
    pages/         Role-based pages (donor/, receiver/, admin/)
    components/    Shared UI + Leaflet map + impact components
    features/      Auth (JWT) · Toast notifications
    lib/           API client · format helpers

backend/           FastAPI · SQLAlchemy 2 · SQLite (default) / PostgreSQL
  app/
    api/           REST routes (rescues, offers, impact, admin)
    models/        SQLAlchemy models + enums
    services/      Matching engine · rescue lifecycle · impact calculations
    seed/          init_db.py (base) · seed_extended.py (30+ rescues)
    schemas/       Pydantic v2 request/response schemas
```

**Key packages**: `react-leaflet@4` (Leaflet + OSM maps), `recharts` (charts), `lucide-react` (icons), `@tanstack/react-query` v5 (server state), `react-router-dom` v7.

---

## 🚀 How to Run

### Prerequisites
- Node.js 20+, Python 3.11+

### Backend

For optional online PostgreSQL, keep your SQLite configuration and add the pooled
Neon URL to `NEON_DATABASE_URL` in `backend/.env`. Set `DATABASE_TARGET=neon` to
switch, or `local` to return. See [Neon setup](docs/NEON_DATABASE.md).

```bash
cd backend

# 1. Create virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure (uses SQLite by default — no Postgres needed)
# In backend/.env, comment out DATABASE_URL to use SQLite:
# DATABASE_URL=sqlite:///./rescuerelay.db   ← already the fallback

# 4. Restore the shared database and enable Git synchronization (once per clone)
python -m app.db.snapshot install
python -m alembic upgrade head

# 5. Start server
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

The populated development database now travels with Git in `backend/data/shared.sql`.
Commits export the dataset; pulls restore it with conflict checks and local backups.
See [database sharing and recovery](docs/SHARED_DATABASE.md) before replacing existing
local data. For a separate fresh generated dataset, use `python -m app.seed.seed_extended`.

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Demo accounts (password: `demo123`)

| Role     | Email                        |
|----------|------------------------------|
| Donor    | donor@rescuerelay.demo       |
| Receiver | hope@rescuerelay.demo        |
| Admin    | admin@rescuerelay.demo       |

---

## 🎬 3-Minute Demo Walkthrough

> Click path for judges — start at http://localhost:5173

### 1. Landing (0:00–0:20)
- Open `/home` — see the hero with **live meal counter**, how-it-works, role CTAs, safety disclaimer
- Click **"I'm a Donor"** → login as `donor@rescuerelay.demo` / `demo123`

### 2. Donor flow — post surplus in <60s (0:20–1:10)
- **Donor Home**: see urgency card, stats, "Repost last listing" button
- Click **"Post Surplus Food"** (green CTA)
- **Step 1 (Food)**: tap a food chip (e.g. "🍗 Chicken Biryani") → auto-fills name; use stepper to set quantity (e.g. 100); dietary chips auto-select
- **Step 2 (Handling)**: select "Yes, untouched"; pick "🔥 Kept hot" handling card
- **Step 3 (Deadline)**: tap "2 hrs" preset → see live countdown; tick attestation → **Post & Find Match**
- Toast: "Rescue posted! Finding the best match nearby."
- **Active Rescue page**: show urgency colour bar, animated timeline, CO₂e estimate

### 3. Receiver flow — accept offer (1:10–1:50)
- Open new tab → login as `hope@rescuerelay.demo` / `demo123`
- **Receiver Home**: list/map toggle — switch to **Map view** (Leaflet pins over Madhapur)
- Switch back to **List** — see offer card with urgency timer, match score breakdown
- Click **"Show match details"** → proximity/capacity/timing bars
- Accept → **Active Pickup page**
  - Tick all 4 checklist items (temp OK, packaging intact, within time, quantity matches)
  - Enter pickup code (from donor's screen), set collected servings → **Confirm collection**
  - Toast: "Collected! 100 servings confirmed."
  - Preview **WhatsApp notification** (demo modal)
  - Confirm delivery → 🎉 success screen

### 4. Impact & Admin (1:50–2:30)
- Donor tab → **Impact** page: animated stat cards (meals, kg CO₂e, food weight), bar chart of recent rescues, "How we calculate" with WRAP UK assumption tooltip
- **Admin** tab → login as `admin@rescuerelay.demo` / `demo123` → Overview: 6 stat cards + weekly trend line chart

### 5. Business case (2:30–3:00)
- Share impact card, methodology note
- Highlight: no tax language, clear "estimates" labels, safety disclaimer on every screen

---

## 📐 Assumptions & Constants

All configurable in one place — `backend/app/services/matching_service.py` (matching weights) and `backend/app/services/impact_service.py` (CO₂e formula).

| Assumption | Value | Source |
|---|---|---|
| kg per meal | 0.4 kg | Estimate (typical Indian meal portion) |
| kg CO₂e per kg food waste | 2.5 | WRAP UK (stated assumption) |
| Matching: proximity weight | 35% | Configurable constant |
| Matching: urgency weight | 30% | Configurable constant |
| Matching: need weight | 20% | Configurable constant |
| Matching: reliability weight | 10% | Configurable constant |
| Matching: fairness weight | 5% | Configurable constant |

---

## 🛡️ Guardrails

| Rule | Implementation |
|------|----------------|
| No food safety certification | Disclaimer on every listing, claim, and pickup screen |
| No tax/legal language | Searched and removed from all UI copy |
| Synthetic data only | "Sample data" label in every dashboard |
| Approximate location publicly | Exact address revealed only after claim confirmed |
| Untouched food only | Blocked at Step 2 if donor selects "served/mixed" |
| Mandatory safety attestation | Cannot post without ticking attest checkbox |
| Receiver collection checklist | 4-item checklist before code entry is unlocked |

---

## 🔭 Future Scope

- **Real-time** via WebSockets (currently polls every 3–5 s)
- **Push notifications** (PWA + Firebase)
- **Volunteer / driver** role with route optimisation
- **Multilingual** (Hindi / Telugu) — stubs in place
- **PostgreSQL** production deployment with connection pooling
- **Rating system** (two-way, post-delivery)
- **CSR sponsor dashboard** with live meal-sponsorship counter
- **City-level heatmap** for municipal food-waste analytics
- **PDF impact certificate** (no tax language)

---

## 🏷️ Trade-offs & Stubs

| Feature | Status | Note |
|---------|--------|------|
| Live map (Leaflet) | ✅ Working | Sample pins; real coords after org signup |
| WhatsApp notification | 🟡 Simulated | Modal preview only, no real API |
| Photo upload | 🟡 Placeholder | UI present, no storage backend |
| Volunteer role | 🟡 Partial | No dedicated volunteer dashboard |
| Multilingual | 🟡 Stub | English only; i18n structure in place |
| PWA install | 🟡 Partial | Vite PWA plugin not yet configured |
| PDF export | ❌ Not built | Listed in future scope |
| Real-time push | ❌ Not built | Polling at 3–5 s intervals |
| PostgreSQL | 🟡 Optional | SQLite default; switch via DATABASE_URL in .env |
