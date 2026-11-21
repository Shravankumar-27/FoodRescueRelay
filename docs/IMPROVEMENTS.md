# Improvement delivery and verification

## Implemented

- Compatible open listings are available to all eligible receivers. Direct offers remain priority invitations rather than exclusive visibility. Claims revalidate dietary needs, allergens, distance, timing, verification and available capacity; declines persist.
- Claim transactions serialize capacity reservations and protect against concurrent acceptance. Reservations release when a rescue is delivered, cancelled or expired.
- Uncollected listings expire at pickup-by, including claimed listings. Collected food remains in delivery coordination. Delivery counts and rejected quantities update both participants' views and impact records.
- Donors have receiver availability, free capacity, needs, transport details, filters, trust, distance, partner chat and a receiver-only map. Receivers have compatible donor listings, a donor-only map and active pickup shortcuts.
- Private partner conversations work before posting or claiming, with unread indicators and suggested messages. Rescue conversations are restricted to the donor, accepted receiver and admin.
- Extended dietary labels, food categories and allergen exclusions are stored and enforced by the matching engine. Unknown allergens do not satisfy receiver exclusions.
- Trust uses completion history, synthetic reliability and completed-handoff ratings. Rankings show verified organizations and real application outcomes; no fabricated place ratings are displayed.
- Personal and community impact use confirmed delivered servings, weekly charts and explicit illustrative weight/emissions assumptions. Donors can export CSV delivery records.
- Admin pages include a live status pipeline, pending verification, organization review with reasons, suspension restrictions during active handoffs and trust recomputation.
- Compact responsive dashboards, mobile navigation, accessible controls, map clustering/fallbacks and lazy route loading improve presentation and usability.
- Repeat-last-listing, a donor time-value calculator and a documented free/core and paid-tools business proposal support repeat use.

## Running this version

Back up any non-disposable database before migration. In `backend`, run `python -m app.seed.init_db` for the existing synthetic demo: it performs an idempotent additive schema upgrade without deleting existing organizations. For Alembic-managed databases, run `alembic upgrade head` (migration `0003_community_features`). Restart the backend after updating source. Do not reset the database just to obtain new fields.

Run `python -m app.workers.dispatch_worker` alongside the API for unattended offer rotation and expiry. Relevant API reads also advance expiry, so stale listings disappear when dashboards refresh. The worker is required for updates when nobody is browsing.

## Verification

Backend regression coverage includes multi-account visibility, claim revalidation, concurrent claims, persistent declines, expiry, capacity reservations, partial delivery and both parties' impact, private chat, dietary/allergen matching, admin authorization and repeatable upgrades from a legacy SQLite schema. Frontend coverage includes timeline semantics, polling and core components. The production build typechecks all routes.

Verification passed: 54 backend tests, 24 frontend tests and the production TypeScript/Vite build. A dependency deprecation warning remains in Starlette's test client.

Browser QA uses only synthetic local data. A donor posted 25 servings; a different eligible receiver claimed the open listing, collected with the handoff code, delivered 24 and rejected one. Both accounts showed the delivery result and the receiver's impact recorded 24 meals. Admin pipeline and verification controls were also inspected. Mobile layouts were checked at a 390-pixel viewport without horizontal overflow.

## Explicit limits and next production work

- Pricing is a hypothesis; billing, paid plans, multi-location teams, recurring schedules and sponsor contracts are not implemented.
- Messages and unread alerts are in-app polling. There is no SMS, email or push delivery service, dedicated volunteer dispatch, or turn-by-turn tracking.
- Capacity describes current availability. Opening-hour schedules and automatic recurring capacity are future work.
- Review stars describe actual handoffs inside the app, not external venue reviews. Map locations are approximate and synthetic.
- Food safety is not certified. Allergen and handling declarations still require participant verification. Emissions and weight are illustrative estimates, not measured savings or carbon credits.
- Validate production PostgreSQL migrations and load/concurrency separately; automated regression runs here use SQLite. Real-world partner onboarding, payment infrastructure and operational security need a separate production rollout.
- A sub-minute post is a design target; it needs timed testing with real caterers. No claim of zero remaining bugs or production readiness is made.
