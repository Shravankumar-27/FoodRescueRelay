# RescueRelay — Build Checklist

Status at the end of the latest build run. Build machine: Windows host, no shell access for the editing agent.

## Verified by running commands
- [x] Backend tests on SQLite: 41 passed (`python -m pytest -v` from backend/), including the hero flow, concurrent claims (exactly one 200, rest 409), JWT secret validation, and dispatch timeout worker
- [x] Backend tests on PostgreSQL 17: 41 passed against local PostgreSQL 17 (127.0.0.1:5433, database rescuerelay_test) selected via TEST_DATABASE_URL
- [x] Alembic: `upgrade head` works on PostgreSQL (Context impl PostgresqlImpl) and on SQLite; on SQLite, 0001 initial schema and 0002 partial unique index (one ACCEPTED offer per rescue) apply on a fresh database, and downgrade and re-upgrade succeed
- [x] Seed on PostgreSQL: `python -m app.seed.init_db` prints "Database ready: organizations=5 users=5 receiver_capacities=3"
- [x] Demo seed is idempotent; `python -m app.seed.reset_demo` runs
- [x] Frontend: `tsc --noEmit` 0 errors; Vitest 22 of 22 tests pass across 10 files; `vite build` succeeds (main chunk 277.06 kB raw, 82.67 kB gzip)
- [x] JWT secret guard: with DEMO_MODE=false the app refuses the default or short JWT_SECRET; docker-compose requires JWT_SECRET to be set
- [x] Dispatch timeout: an expired offer is marked TIMED_OUT by the worker tick and the next candidate receives the offer (rank 2); a non-expired offer is untouched
- [x] Receiver history endpoint GET /api/v1/offers/history exists and the history page uses it
- [x] Safety wording: no "verified safe", "certified safe" or "guaranteed safe" in frontend source

## Not verified
- [ ] Docker: docker-compose.yml, backend/Dockerfile and frontend/Dockerfile are written but Docker is not installed on the build machine, so they have not been built or run

## Open
- [ ] Docker/compose unverified (see above)
- [ ] Browser walkthrough of docs/DEMO.md has not been performed; command and path references in the docs were checked against the files
- [ ] Malformed line in backend/.env is reported by python-dotenv; fix it (until fixed, the warning appears on every run)
- [ ] Reliability values are synthetic seed data; no real reliability calculation exists
- [ ] Frontend tests cover components and login only; no page-level flow tests

## Cancelled / deferred
- [-] Playwright E2E test: not added. Browser automation needs new dependencies and browser binaries that could not be installed and run in this environment. The backend hero-flow test covers the same flow; docs/DEMO.md has the manual steps
- [-] AI smart-post: not implemented. The spec makes it optional and only after the core is stable; it also needs a provider API key, which is not available here. AI_ENABLED=false is the default, and the manual form is the only path
