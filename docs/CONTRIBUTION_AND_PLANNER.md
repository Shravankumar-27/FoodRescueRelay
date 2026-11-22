# Kindness club and community allocation

Implemented 22 November 2026. The user's explicit request for coins and medals supersedes the earlier checklist's exclusion of gamification. These are recognition points, not cryptocurrency or a financial product.

## Contribution rules

Both the donating and receiving organization earn **10 kindness coins per receiver-confirmed delivered serving**. For example, 25 collected, 24 delivered and 1 rejected produces 240 coins for each partner and **24 community meals**, not 48. No credit is given for posting, claiming, rejected servings, planning, ratings or certificate issuance. Coins are derived from unique delivery impact records on every read; retries, split listings and reissued appreciation cannot multiply per-meal credit.

| Medal | Lifetime coins | Confirmed meals |
|---|---:|---:|
| Seed of kindness | 10 | 1 |
| Bronze heart | 1,000 | 100 |
| Silver table | 5,000 | 500 |
| Golden harvest | 15,000 | 1,500 |
| Community champion | 50,000 | 5,000 |

Weeks run Monday–Sunday UTC. A streak includes consecutive weeks containing a positive delivery; a current week still in progress does not break the previous week's streak. Lifetime points do not expire. Food quantity is receiver reported, not independently measured. Medals indicate volume of contribution, not safety certification, organizational worth or a trust rating. Trust tiers remain separate.

Coins cannot be bought, transferred, redeemed or exchanged for cash, discounts, carbon credits or tax benefits. They do not influence food access or matching. There is no artificial bonus for creating extra listings or collecting excess food. The community rankings show contribution medals alongside the separate trust tier.

## Actual benefits available now

- Lifetime contribution certificate and illustrated promotional poster for **both roles**, in cream or forest/gold; 1080 × 1350 PNG plus print/PDF layout.
- Donor appreciation and receiver pride variants for receiver-issued delivery records.
- Community story copy, latest-100 coin ledger CSV, and existing impact reports and feedback.
- Transparent next-medal progress, active weeks, partner count, and milestone recognition.
- Receiver allocation plans and exportable packing lists.

These tools are available from the first rescue, without spending points. Recognition appears on dashboards, the Kindness navigation destination, desktop account headers and community rankings. The lifetime certificate comes from RescueRelay's platform records; it is **not** a receiver endorsement of every donation. A separate receiver-issued acknowledgement remains under receiver consent and withdrawal controls.

Artwork contains **no printed links or QR codes**. Verification links remain in the appreciation studio UI. Public acknowledgement withdrawal prevents new export from that record; existing downloaded images cannot be recalled. Lifetime artwork is a dated aggregate, not a signed or immutable certificate. All demo artwork labels synthetic data and illustrative food-weight assumptions (0.4 kg per delivered meal).

## Receiver planner

Open **Kindness → Plan every portion**, the receiver home shortcut, or a collected/delivered handoff. Choose one of the latest 100 received batches. Only the actual receiver can read or write its plan.

The plan is a private draft, not an inventory system or proof of distribution. For COLLECTED rescues, the ceiling is actual collected servings. For DELIVERED rescues, it is final delivered servings and the UI labels the plan retrospective. If final delivery is smaller than an existing draft, the plan is marked as needing revision. Food from an old delivered batch is never presented as current stock.

Up to 20 groups have a generic label, planned people, whole servings and dietary/packing notes. Names must be distinct; no individual beneficiary details are needed. Suggested allocation uses the largest-remainder method proportional to group size, caps at one serving per person, and leaves excess unallocated. Group order breaks exact rounding ties. Manual adjustments can account for different needs, within the batch total. Shortfalls remain visible rather than being turned into invented people-fed figures.

Original food, allergens and handling information stay visible. Partial pickup contents are not inferred from original proportions. The receiver must review group needs and handling before saving. The algorithm does not automatically certify dietary suitability or safety. Saving never updates delivered totals, people served, capacity or coins.

Writes lock the rescue while checking actual quantity, validate the serving ceiling server-side and require the current revision. A stale edit returns 409 rather than overwriting another team member's plan. CSV packing lists are labeled drafts and escape spreadsheet formula starters.

## Validation and rollout

Migration `0005` creates `food_allocation_plans`; coins require no balance migration because they derive from existing confirmed deliveries. `python -m app.seed.init_db` upgrades the synthetic demo non-destructively; use `alembic upgrade head` on Alembic-managed installations. Restart the API. Reset-demo removes plans before rescues.

Backend regression coverage includes both-role credit, no rejected-food credit, no duplicate credit, recognition withdrawal, rankings, scoped access, invalid allocations, revision conflicts, reduced final quantities and exclusion of uncollected food. Frontend tests cover integer allocation conservation, surplus handling, safe SVG text, receiver credits and link-free artwork.

Production payment/discount arrangements, independent quantity verification, PostgreSQL deployment testing and measured carbon accounting are not part of this release. Useful future commercial offers require real agreements: paid multi-location reporting for donors, sponsor-funded pickup operations and aggregate CSR reporting. Never advertise an uncontracted discount as an earned coin benefit.

Final checks: **77 backend tests**, **30 frontend tests**, and the TypeScript/Vite production build passed. Browser validation covered both roles, actual 1080 × 1350 PNG exports, saved plan reload, and mobile layouts at 390px with no horizontal overflow. The sample 24-meal delivery yields 240 coins for each partner. Its saved receiver plan allocates 16 and 8 servings to groups of 20 and 10, clearly showing a six-serving shortfall. Plans did not change confirmed recipients or coins. Updated screenshots and poster exports are in `docs/screenshots/`. Physical printing and production load testing were not performed.

A clean SQLite Alembic upgrade through revisions 0001–0005 also passed in a disposable migration database.
