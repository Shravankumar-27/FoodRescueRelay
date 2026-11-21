# CHANGELOG

All notable changes to RescueRelay, in reverse chronological order.

---

## Phase 6 — Polish, Seed Data, Demo Infrastructure *(2026-11-21)*

### Added
- **Extended seed** (`backend/app/seed/seed_extended.py`): 8 donor orgs, 15 receiver orgs, 10+ users, 30 historical rescues spanning 4 weeks across Hyderabad localities (Madhapur, Kondapur, Jubilee Hills, Hitech City, Banjara Hills, Gachibowli, Kukatpally, Secunderabad)
- **README rewrite**: problem/solution, architecture diagram, 3-minute demo script, assumptions table, guardrails, trade-offs

### Changed
- Seed data now labelled "Sample data" everywhere in UI

---

## Phase 5 — Impact + Analytics + Admin *(2026-11-21)*

### Added
- **DonorImpactPage**: CO₂e avoided stat (formula: meals × 0.4 kg × 2.5 kgCO₂e/kg), food weight stat, bar chart of recent rescues (recharts), "assumption" tooltip on every derived number, shareable impact card
- **AdminOverviewPage**: 6 KPI stat cards (meals, rescues, CO₂e, avg time, claim rate, active receivers), weekly trend line chart (recharts, sample data), demo mode banner, assumptions footer

### Changed
- All impact estimates labelled as estimates; no tax/legal language anywhere
- Assumptions sourced from WRAP UK and stated inline

---

## Phase 4 — Pickup Status + Volunteer Flow *(2026-11-21)*

### Changed
- **ActivePickupPage** (receiver): Added 4-item collection checklist (temperature, packaging, time window, quantity) — must be fully ticked before confirm button unlocks; photo placeholder button; WhatsApp/SMS preview modal; success screen with animated 🎉 delivery complete; toast on collect/deliver; better error display

---

## Phase 3 — Matching + Map *(2026-11-21)*

### Added
- **RescueMap component** (`frontend/src/components/map/RescueMap.tsx`): Leaflet + OpenStreetMap, donor (green) and receiver (blue) SVG pins, 2 km and 5 km distance rings, popups — no paid API keys
- **ReceiverHomePage**: List/Map toggle; map view with 4 synthetic Hyderabad pins; urgency colour bar on each offer card (green/amber/red based on pickup countdown); expandable match score breakdown (proximity, capacity, time bars); handling type now uses corrected backend enum labels (HOT_HELD, REFRIGERATED, ROOM_TEMPERATURE)

### Changed
- Leaflet installed at `react-leaflet@4` (React 18 compatible; v5 requires React 19)
- `@testing-library/dom` installed (required peer dep for `@testing-library/react@16`)

---

## Phase 2 — Donor Flow Upgrade *(2026-11-21)*

### Added
- **DonorHomePage**: Urgency card with colour-coded countdown (fresh/warn/urgent), stat grid with icons, "Repost last listing" button with toast feedback, chevron links in recent rescue list
- **CreateRescuePage** major upgrade:
  - Visual 3-step progress bar (StepBar component)
  - 10 Hyderabad food type quick-chips (tap to auto-fill name + dietary type)
  - Quantity stepper (+/− buttons) + preset chips (25/50/100/200)
  - Dietary type as tap-chips instead of `<select>`
  - Step 2 handling as visual radio cards with icon + description
  - Pickup time presets (1 hr / 2 hrs / 3 hrs / Custom) with live countdown preview
  - Autosave indicator ("Draft saved ✓")
  - Toast on success
- **ActiveRescuePage** upgrade:
  - Urgency colour bar at top (green/amber/red)
  - Handling info section with icons (🔥❄️🌡️)
  - Pickup code card with copy toast
  - CO₂e estimate on delivery
  - Repost link on EXPIRED/CANCELLED
  - Safety disclaimer card at bottom

### Changed
- `Card` component: added `"fresh"` variant (green tint)
- `ToastContext`: upgraded to accept `{ variant, title, message }` object API; toast items now show title + body

---

## Phase 1 — Design System + Layout Shell *(2026-11-21)*

### Added
- Extended `tailwind.config.js`: freshness tokens (`fresh`, `warn`, `urgent` + backgrounds), dark mode class strategy, keyframe animations (`slide-in-right`, `fade-in`, `count-up`, `shimmer`), custom box shadows and border radius scale
- `index.css`: Inter font, shimmer skeleton, Leaflet map override, custom scrollbar
- **ToastContext** (`frontend/src/features/toast/ToastContext.tsx`): toast stack, 4 variants, auto-dismiss
- **Badge** component (6 variants, optional dot)
- **Modal** component (3 sizes, ESC to close, backdrop click)
- **ProgressBar** component (5 colour variants)
- **Button** component: `size` prop (sm/md/lg), `accent` variant, active scale animation
- **Card** component: `variant` prop (8 styles incl. fresh), `onClick`/`hover` props
- **Skeleton** component: `lines` prop, shimmer CSS animation
- **LandingPage** (`/home`): hero with meal counter, 3-step how-it-works, role CTA buttons, safety disclaimer, footer
- **LoginPage**: show/hide password, demo account quick-fill buttons with role labels
- **AppShell**: Lucide icons, bottom nav (all roles, mobile), sidebar (desktop), role badge, online/offline indicator

### Packages installed
- `lucide-react`, `recharts`, `react-leaflet@4`, `leaflet`, `@types/leaflet`, `@testing-library/dom`

---

## Pre-upgrade Bug Fixes *(2026-11-21)*

| Bug | Fix |
|-----|-----|
| Backend pointed to PostgreSQL on port 5433 (not running) | Commented out `DATABASE_URL` in `.env` → SQLite fallback |
| "Invalid fields" on rescue POST | Frontend sent `holding_condition`/`notes`; backend expects `handling_type`/`handling_notes` → renamed in `buildBody()` and added alias in schema |
| `toBeInTheDocument` TS error in tests | Changed import to `@testing-library/jest-dom/vitest` |
| `Menu`/`X` imported but unused in AppShell | Removed unused imports |
| `mobileMenuOpen` state declared but unused | Removed unused state |
| Recharts Tooltip formatter type error | Removed explicit `number` annotation on `v` parameter |
