# Food Rescue Relay — Project Guide

*Rescue good food. Relay it to your community.*

This guide explains the current product, why each part exists, and how the pieces work together. The project is a Hyderabad-focused demo for event caterers and community kitchens. Accounts and activity included with the project are synthetic.

## 1. The problem and the approach

Event venues and caterers can have usable surplus food at the end of service. Community kitchens and NGOs may need food nearby, but coordinating over calls alone makes it hard to compare dietary fit, quantity, capacity, travel time, pickup deadlines and the final delivered amount.

Food Rescue Relay gives both sides a shared listing and handoff timeline. It helps partners coordinate a time-sensitive transfer and record what happened. It connects people; it does not inspect or certify food.

The pilot focus is intentionally narrow: **event caterers and community kitchens in Hyderabad**. This makes distances, sample organizations and the initial donor flow coherent for a demo. The product can later expand to restaurants, hostels, canteens and other neighbourhoods.

## 2. Roles and their goals

### Donor

The donor is a caterer or venue team member with surplus to move. Their goal is to post accurate information quickly, find a suitable nearby receiver, coordinate collection and record the result for their business and community.

### Receiver

The receiver is an NGO, shelter or community kitchen coordinator. Their goal is to find food that fits their current need, diet, capacity, storage, transport and time window, then plan its distribution and report what was delivered.

### Admin

The admin monitors the network. They review organizations, inspect rescue statuses, check impact totals and manage appreciation records. The admin identity check is about partner identity; it does not verify food safety.

## 3. Donor journey

1. **Open the dashboard.** The donor sees active handoffs, recent donations, impact and shortcuts to post food, history and contribution recognition.
2. **Create a listing.** The guided form captures the food name, servings, food category, diet, allergens, preparation time, handling/storage and pickup deadline. Smart paste can parse a sentence into a draft; the donor reviews and confirms each field. Draft recovery and repeat-listing tools reduce repeat work.
3. **Find a receiver.** The donor sees potential receiver organizations and matching reasons. Matching filters for eligibility and ranks feasible receivers using distance, urgency, need, reliability and fairness. A donor map displays receivers, never donor locations.
4. **Coordinate a claim.** A short suggested-message chat is available for the assigned handoff. The exact pickup address is hidden until the receiver claims the offer. The rescue detail page shows status and any pickup code needed by the receiver.
5. **Follow through.** The donor sees matching, offer, claim, collection and delivery progress. A collected rescue remains in progress until the receiver records the delivered/rejected quantities.
6. **Review impact.** Confirmed deliveries feed the donor impact and contribution views. The donor can export a CSV, view per-delivery appreciation, and create an overall contribution poster.

## 4. Receiver journey

1. **Set current capacity.** The receiver records available servings, food categories and dietary preferences, excluded allergens, refrigeration, containers and transport. Matching uses those settings to remove unsuitable offers.
2. **Browse food.** The receiver sees compatible donor listings with food, serving count, handling, allergen and pickup-window details. The receiver map shows donors only; before a claim, locations are approximate.
3. **Accept and coordinate.** The receiver reviews the match and pickup details, claims only if the team can collect in time, and uses the suggested-message chat to coordinate.
4. **Confirm pickup.** The receiver records logistics and pickup checks, enters the donor’s pickup code and logs the collected quantity. The code confirms handoff; it is not a food-safety check.
5. **Record delivery.** The receiver records delivered and rejected servings separately. This updates the rescue status for both partners. Only delivered servings count as meals in the impact model.
6. **Plan distribution.** The allocation planner divides the collected batch among named groups and can export a packing-list CSV. It is a planning tool: group names and planned servings do not prove that individuals received food.
7. **Show the receiver’s contribution.** Receiver impact, coins, medals, rankings and an overall recognition poster can celebrate the organization’s work. The receiver can describe the food that may have gone to waste without claiming that a specific amount was definitely wasted.

## 5. Matching, timing and handoff status

The backend uses deterministic rules; there is no AI or LangGraph workflow. It first checks whether the receiver is suitable: current availability, capacity, accepted diet and food categories, allergen restrictions, refrigeration needs, transport and whether estimated travel fits the pickup deadline. Ineligible receivers are excluded with explanations.

Feasible receivers are ranked using these configurable weights:

| Factor | Weight | What it represents |
| --- | ---: | --- |
| Proximity | 35% | Estimated distance to the listing |
| Urgency | 30% | Time available for the handoff |
| Need | 20% | Receiver’s reported need level |
| Reliability | 10% | Prior handoff reliability |
| Fairness | 5% | Avoiding repeated allocation to the same receiver |

The donor’s posting window and the food’s estimated consume-by time are used to set practical time limits. The dispatch service can expire and rotate offers and release missed claims while there is time to rematch. Unclaimed listings can escalate by widening the search area and marking the listing urgent. A worker is provided for periodic processing; on hosted setups, periodic behavior depends on deploying that worker. Request paths also process relevant expired offers when users view or act on rescues.

The handoff timeline uses these main statuses:

- **Posted:** The donor submitted a listing.
- **Matching:** The app is finding eligible receivers.
- **Offered:** A receiver has a time-limited offer.
- **Claimed:** A receiver accepted; private pickup details are available to that receiver.
- **Collected:** Pickup was confirmed with the short code and quantity.
- **Delivered:** The receiver recorded delivered and rejected counts.
- **Expired / Cancelled:** The pickup window ended or the donor cancelled the listing.

The distinction between **collected** and **delivered** matters: collecting food is not the same as confirming distribution.

## 6. Trust, ratings, rankings and recognition

Both roles can build a record through completed handoffs. Partner ratings and reliability are shown as trust signals, while the leaderboard ranks organizations by receiver-confirmed meals and then trust. Rankings are for community visibility; they do not affect who can access food or matching priority.

Contribution rewards are calculated from confirmed delivered servings:

- 10 kindness coins per delivered meal for both participating partners.
- Recognition tiers: Seed of kindness (10 coins), Bronze heart (1,000), Silver table (5,000), Golden harvest (15,000), and Community champion (50,000).
- Coins cannot be redeemed, transferred or exchanged for cash. Posting, claiming, ratings and planning do not earn coins.

Receiver-issued appreciation can record the donor, receiver, delivered quantity, feedback and date. The appreciation studio creates per-delivery posters and a lifetime/overall contribution poster for donors and receivers. Poster artwork has no external links or QR codes. These records are appreciation only; they are not food-safety certificates, endorsements, tax receipts or legal/CSR credits.

## 7. Impact and the assumptions behind it

The impact pages show personal and community results. Confirmed delivered servings feed meal totals. The demo uses this transparent illustrative model:

1. **Meals:** one confirmed delivered serving counts as one meal.
2. **Estimated food weight:** meals × 0.4 kg per meal.
3. **Estimated avoided emissions:** estimated food weight × 2.5 kg CO₂e per kg of food.

For example, 38 confirmed meals are estimated as 15.2 kg of food and 38 kg CO₂e. This is a model, not a measurement. It does not include transport emissions, and the avoided-emissions assumption is not a claim that the exact amount would otherwise have reached a landfill.

Event reports and impact exports make the assumptions visible and avoid including pickup addresses. Reports are demonstrative and based on synthetic data.

## 8. Admin and business views

The admin dashboard summarizes active, completed and expired rescues, partner review counts, weekly meals and the status pipeline. Admin pages show rescue records and organization identity-check status. Admins can review appreciation records and impact assumptions.

The business pack is a **proposal**, not an active subscription product:

- **Pricing and donor ROI:** proposed monthly plans and editable estimates for disposal and staff-time savings. It makes no tax-benefit claim.
- **Sponsor dashboard:** sample route or neighbourhood sponsorship, illustrative cost per meal and a printable sample impact report.
- **City coverage:** sample surplus versus receiver need and median rescue times by neighbourhood.
- **Unit economics:** editable costs, revenue per donor and break-even assumptions.
- **Pilot feedback:** browser-local notes reserved for real partner conversations. No real validation is included by default.

Receiving stays free in the proposal. Donor and sponsor figures use synthetic assumptions. Billing is inactive; the proposal is not proof of willingness to pay.

## 9. First-login tour

After a user’s first login, the app starts a role-specific tour. Donor and receiver tours explain the main workflow and important information on each page; the admin tour covers the operational views. The guide moves between the pages it describes, keeps the focused target visible and can be started again later. It explains page purpose and key actions rather than narrating every control.

## 10. Technology and how the app fits together

```text
React + TypeScript web app
          │ REST / JSON, /api/v1
          ▼
FastAPI routes ── authorization and validation
          │
          ▼
SQLAlchemy services ── matching, dispatch, handoff, impact, trust and rewards
          │
          ▼
SQLite (local) or PostgreSQL / Neon (hosted)
```

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router and TanStack Query. Leaflet powers maps; Recharts powers impact charts.
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, JWT authentication and bcrypt password hashing.
- **Database:** SQLite for the local demo and PostgreSQL/Neon for hosted deployments. Alembic migrations manage schema updates.
- **Hosted data:** The Render API connects to Neon PostgreSQL using `DATABASE_TARGET=neon` and the private `NEON_DATABASE_URL` environment variable. Organizations, accounts, rescues, offers, handoffs, messages, impact and recognition records persist in Neon, not Render’s local filesystem. The frontend only calls the API, so Neon credentials are never exposed to browsers.
- **Database changes:** The container runs `alembic upgrade head` before the API starts. Pending migrations update Neon’s schema while preserving existing rows. `NEON_DIRECT_DATABASE_URL` is optional for migrations; if it is unset, Alembic uses `NEON_DATABASE_URL`. Keep both URLs in Render secrets and never commit them.
- **Demo records:** When `DEMO_MODE=true`, startup seeds synthetic sample organizations and activity. Seeding is designed to be repeatable. Production deployments should use appropriate demo settings and never treat sample records as real partner activity.
- **Dispatch:** deterministic services handle timed offers, rematching, escalation and pickup checks. `backend/app/workers/dispatch_worker.py` can run periodically as a separate process.
- **No external AI dependency:** matching and smart paste are rule-based. AI settings are optional and disabled by default.
- **Deployment:** `render.yaml` describes a Render Blueprint with an API and static frontend. The backend uses Neon when `DATABASE_TARGET=neon` and `NEON_DATABASE_URL` is configured.

## 11. Local demo and walkthrough

Follow the [README local setup](README.md#run-locally). Demo accounts all use the password `demo123`:

| Role | Email |
| --- | --- |
| Donor | `donor@rescuerelay.demo` |
| Receiver | `hope@rescuerelay.demo` |
| Admin | `admin@rescuerelay.demo` |

For a complete donor-to-receiver demonstration, use two separate browser profiles so the sessions do not replace each other:

1. Sign in as the donor and post a small synthetic cooked-meal listing with a future pickup deadline.
2. Sign in as the receiver and find the compatible donor listing. Review the approximate location and food details, then claim it.
3. Return to the donor session and open the active rescue. Use the rescue code shown there for the pickup demonstration.
4. In the receiver session, complete pickup checks, enter the code and record the collected quantity.
5. Record delivered and rejected quantities. Confirm that the donor and receiver views both show **Delivered**.
6. Review both impact views, the receiver’s allocation planner and the appreciation/overall contribution posters.
7. Sign in as admin to show partner status, the rescue pipeline and community figures.
8. Use the landing page, pricing calculator and sponsor/city/business views to explain the proposed operating model.

Start with a new listing; seeded examples can have old or expired pickup windows. The public site and demo accounts use synthetic data only.

## 12. Guardrails and limitations

- Food Rescue Relay coordinates donations; it does not certify food as safe.
- Donors must provide accurate preparation, handling and allergen details. Receivers assess suitability before collection and distribution.
- Exact pickup details are protected until claim. Sample records and demo locations are synthetic; do not use the demo for real personal data.
- Meal, food-weight and CO₂e figures depend on visible assumptions and should be presented as estimates.
- Coins and posters are contribution recognition only. There are no cash rewards, tax benefits or active payments.
- Pricing, sponsorship, city coverage and unit economics are illustrative. Obtain partner interviews and pilot results before treating any assumptions as validated.

## 13. Useful code locations

| Concern | Main location |
| --- | --- |
| Route map and role gates | `frontend/src/app/App.tsx` |
| Donor and receiver tours | `frontend/src/components/layout/TourGuide.tsx` |
| Donor posting and rescue details | `frontend/src/pages/donor/` |
| Receiver discovery and handoff | `frontend/src/pages/receiver/` |
| Matching and ranking | `backend/app/services/matching_service.py` |
| Offer rotation and escalation | `backend/app/services/dispatch_service.py` |
| Pickup/delivery lifecycle | `backend/app/services/pickup_service.py`, `handoff_service.py` |
| Impact and rewards | `backend/app/services/impact_service.py`, `rewards_service.py` |
| API routes | `backend/app/api/` |
| Schema history | `backend/alembic/versions/` |

For project setup, available demo accounts and commands, return to the [README](README.md).
