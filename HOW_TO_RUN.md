# How to run RescueRelay

## Shared database setup

Use `python -m app.db.snapshot install` from `backend` after installing dependencies,
then start the API. This restores the exact committed dataset and enables export
on commit / restore on pull. Each teammate runs this setup once. Do not run seed
or reset commands when you want to preserve shared data. See [the complete sharing
and recovery guide](docs/SHARED_DATABASE.md).

The seed/reset instructions below are for creating a separate fresh dataset.

## Allocation, reassignment, and pickup coordination

Upgrade an existing database with `alembic upgrade head` from `backend`, then run `python -m app.seed.init_db` for a local demo database. Restart the API and frontend afterwards. Migration `0008` adds saved partners and the provider directory.

- **Donors** can open **Explore split plan** under **Match and allocate**, adjust portions, and notify any number of eligible receivers at once. Receivers see the proposal in **Messages**. The offers feed also shows compatible portions of larger postings. Those cards link to the donor so receivers can discuss a split. Standard claims reserve the full posting.
- **Admins** can open **Certificates**, find a confirmed delivery by rescue code, and publish a RescueRelay appreciation certificate. Both organizations can find it in their appreciation studio.
- **Released pickups** appear under **Pickup changes** on the donor dashboard. Dispatch contacts the next eligible receiver automatically, and the donor can send the donation to another eligible receiver from the rescue page while it remains open.
- **Pickup logistics** lists available providers for a missing resource after a receiver accepts. A pickup partner can confirm an arrangement there. Coordinators manage the directory and outstanding requests under **Admin → Rescues**.
- **Meal feedback** opens for the receiver after delivery. Receivers can opt in, edit, or withdraw a response. The donor dashboard shows combined menu insights after three responses.

## Recognition, coins and planner update (November 2026)

The donor appreciation studio and receiver acknowledgement flow use migrations `0004` (recognition) and `0005` (private allocation plans). For an existing synthetic demo, run `python -m app.seed.init_db` from `backend`; this adds the missing schema without deleting your donations. For Alembic-managed databases, run `alembic upgrade head`. Back up non-disposable databases first, then restart the API.

After a delivery: receiver **History → Open rescue → Create appreciation → Issue**. Switch to the donor and open **Kindness → Your storefront story**, or **Impact → Appreciation studio**. Download the poster PNG, choose a theme, print/save PDF, or copy a promotional caption. The receiver can withdraw or correct an acknowledgement from the delivered pickup. See [the checklist audit](docs/CHECKLIST_AUDIT.md) for implemented and deferred capabilities.

Both roles now have **Kindness**: 10 coins per confirmed delivered meal, milestone medals and a lifetime poster with no printed links. Receivers also have **Plan every portion** to save private group allocations and export packing lists. See [contribution and planner rules](docs/CONTRIBUTION_AND_PLANNER.md).

Keep `python -m app.workers.dispatch_worker` running alongside the API for unattended timeout rotation. On PowerShell, use `npm.cmd` when script execution policy blocks `npm.ps1`.

Public verification links use the current browser origin. Localhost links work only on the machine running this demo; share externally only after a deployment provides a reachable frontend and API. No production deployment or payment setup is implied by generating a poster.

These steps are for a **Windows** host. PowerShell commands come first, then CMD, then Linux/macOS. Paths are relative to the repository root.

## Prerequisites

- **Python 3.11+** (3.12 recommended). On Windows, if `python` opens the Microsoft Store or prints nothing, install Python from python.org and use the `py` launcher, for example `py -3.12`.
- **Node.js 20+** and **npm** (for the frontend).
- **Docker Desktop** (optional). Needed only to run PostgreSQL in a container, or to use the full Docker stack.

## 1. Configure the environment

Copy the backend and frontend example files (PowerShell):

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

CMD:

```bat
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Linux/macOS:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env`:

- Set `JWT_SECRET` to a random value of **at least 32 characters**.
- Choose a database (next step).

Generate a secret after the virtual environment exists (step 3):

```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Choose the database

`backend/.env.example` sets `DATABASE_URL` to PostgreSQL on `localhost:5432`. The config file (`backend/app/core/config.py`) defaults to a local SQLite file at `backend/data/rescuerelay.db` when `DATABASE_URL` is not set.

- **With PostgreSQL:** keep `DATABASE_URL` as it is, and do step 2 first.
- **Without Docker:** delete or comment out the `DATABASE_URL` line in `backend/.env`. The app then uses SQLite and needs no database server.

## 2. PostgreSQL via Docker (optional)

From the repository root, with Docker Desktop running:

```bash
docker compose up -d db
```

This starts `postgres:16-alpine` on port 5432 with user, password and database `rescuerelay`. Check it is healthy:

```bash
docker compose ps
```

## 3. Backend setup

### Windows PowerShell

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If PowerShell blocks the activation script, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then try again.

### Windows CMD

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
```

### Linux / macOS

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Use `python -m pip` rather than bare `pip` if you are unsure which interpreter `pip` belongs to.

### Create the schema and seed demo data

With the virtual environment active and the current folder set to `backend`:

```powershell
alembic upgrade head
python -m app.seed.init_db
```

`alembic upgrade head` applies the migrations. With `DEMO_MODE=true`, `init_db` populates fictional postings, deliveries, coins, feedback, appreciation, allocation plans and provider options. It also fills missing history records in older seeded demos. Running it again preserves existing postings and feedback.

Postings, deliveries, feedback, appreciation, favorites and plans are stored in the selected database. A fresh clone recreates the fictional demo from the seed.

### Share live data with teammates

1. Run one RescueRelay API at a team-accessible HTTPS address. Configure its `DATABASE_URL` to use the existing SQLite database on persistent storage, or a team PostgreSQL database. To retain existing records, start with the database that already contains them. Run migrations on that database when updating the API.
2. Each teammate creates `frontend/.env.local` with the same API origin, then restarts the frontend.

   ```dotenv
   VITE_API_BASE_URL=/api/v1
   RESCUERELAY_API_TARGET=https://api.your-team.example
   ```

3. Run `npm run dev` in `frontend` and sign in to the appropriate organization. Teammates only need the frontend. They can see new activity from the shared API as their views refresh, subject to the usual organization permissions.

Keep database credentials on the API host. A hosted frontend can use the same API by routing `/api/v1` to it in its hosting configuration.

With the optional Docker Compose setup, put `RESCUERELAY_API_TARGET` in the repository-root `.env` alongside the existing Compose settings. Run `docker compose up --build --no-deps frontend` to connect the frontend to the shared API without starting a local backend and database.

### Load a teammate's SQLite snapshot

1. Receive the `.db` snapshot privately from the teammate who owns the records. Place it in `backend/data/` as `team-snapshot.db`.
2. Set `DATABASE_URL=sqlite:///./data/team-snapshot.db` in `backend/.env`. Run the backend from `backend` and sign in to the organization that owns the records.

The snapshot contains account and pickup records. Keep it outside Git. A snapshot preserves the data as of the export. Use the shared API above to see later changes.

### Start the API

```powershell
uvicorn app.main:app --reload --port 8000
```

`app.main:app` is the FastAPI object in `backend/app/main.py`. If the module path is not found, check that the current folder is `backend`. Running `python -m uvicorn app.main:app --reload --port 8000` also works.

Leave this window open. Stop the server with `Ctrl+C`.

## 4. Frontend setup

In a second terminal, from the repository root:

```powershell
cd frontend
npm install
npm run dev
```

The Vite dev server runs on **port 5173** (set in `frontend/vite.config.ts`).

## 5. URLs

| What | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API base | http://localhost:8000/api/v1 |
| Swagger (interactive API docs) | http://localhost:8000/docs |
| Health check | http://localhost:8000/api/v1/health |

The health check returns `{"success": true, "data": {"status": "ok", "database": "ok"}, ...}` when the database is reachable.

## 6. Demo accounts

**Demo only.** These accounts are seeded by `init_db` and `reset_demo` for demonstration. Do not use them, or the password, in any real deployment.

Password for every account: `demo123`

| Email | Role | Organization |
|---|---|---|
| donor@rescuerelay.demo | donor | Madhapur Grand Events |
| hope@rescuerelay.demo | receiver | Hope Community Kitchen |
| shelter@rescuerelay.demo | receiver | ShelterServe |
| cityfood@rescuerelay.demo | receiver | City Food Relief |
| admin@rescuerelay.demo | admin | RescueRelay Admin |

For the step-by-step demo, see [docs/DEMO.md](docs/DEMO.md).

For the pickup support demo, sign in as `asha@rescuerelay.demo` and open the active Kondapur pickup. Demo providers are listed for both missing resources. Confirm both arrangements to unlock collection. The pickup code is on the donor view under `kondapur@rescuerelay.demo`.

## 7. Reset demo data

To clear rescues, offers, handoffs and impact records, restore receiver capacities, and re-seed the demo data:

```powershell
cd backend
python -m app.seed.reset_demo
```

Run this with the virtual environment active. Users and organizations are kept and re-created if missing. Stop the API first if the database is in use.

Use this before each demo. The seeded demo rescue uses times relative to when it was seeded, so a reset also refreshes it.

## 8. Tests and checks

Backend (from `backend`, virtual environment active):

```powershell
python -m pytest -q
```

Tests use their own SQLite file, `backend/data/_pytest.db`, and do not touch the demo database.

To run the backend tests against PostgreSQL instead:

1. Start a PostgreSQL server. Docker users can run `docker compose up -d db`. Without Docker, see [Local PostgreSQL without Docker](#local-postgresql-without-docker) below.
2. Set `DATABASE_URL` (the demo database) and `TEST_DATABASE_URL` (the test database) in `backend/.env`. Use your own password in place of `<APP_PASSWORD>`:

```env
DATABASE_URL=postgresql+psycopg://rescuerelay_app:<APP_PASSWORD>@127.0.0.1:5433/rescuerelay
TEST_DATABASE_URL=postgresql+psycopg://rescuerelay_app:<APP_PASSWORD>@127.0.0.1:5433/rescuerelay_test
```

Port 5433 is the separate local cluster described below. A Docker server uses port 5432 instead.

3. Start the cluster if it is not running (PowerShell, from the repository root):

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" -D "$env:USERPROFILE\.rescuerelay-pg\data" -l "$env:USERPROFILE\.rescuerelay-pg\server.log" -o "-p 5433 -c listen_addresses=127.0.0.1" start
```

4. From `backend` with the virtual environment active, create the schema, seed the demo data and run the tests:

```powershell
python -m alembic upgrade head
python -m app.seed.init_db
python -m pytest -q
```

The test database is selected by `TEST_DATABASE_URL`. When it is set, the tests use that PostgreSQL database instead of `backend/data/_pytest.db`. The tests drop and recreate all tables in the target database, so it must be a dedicated database such as `rescuerelay_test`, never the demo database. The target database must already exist.

If the python-dotenv warning about a malformed `.env` line appears, open `backend/.env` and fix the line it names (usually a missing `=` or a stray character). Until it is fixed, the warning appears on every run.

### Local PostgreSQL without Docker

This creates a separate PostgreSQL 17 cluster on port 5433, so an existing server on 5432 is not changed. Replace `<SUPERUSER_PASSWORD>` and `<APP_PASSWORD>` with passwords you choose. Do not write real passwords into any file in the repository.

1. Create the cluster (PowerShell). `initdb -W` prompts for the superuser password:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\initdb.exe" -D "$env:USERPROFILE\.rescuerelay-pg\data" -U postgres -A scram-sha-256 -W
```

2. Start the cluster:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" -D "$env:USERPROFILE\.rescuerelay-pg\data" -l "$env:USERPROFILE\.rescuerelay-pg\server.log" -o "-p 5433 -c listen_addresses=127.0.0.1" start
```

3. Create the application role and the two databases with `psql`:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h 127.0.0.1 -p 5433 -U postgres
```

At the `postgres=#` prompt, run:

```sql
CREATE ROLE rescuerelay_app LOGIN PASSWORD '<APP_PASSWORD>';
CREATE DATABASE rescuerelay OWNER rescuerelay_app;
CREATE DATABASE rescuerelay_test OWNER rescuerelay_app;
\q
```

4. Stop the cluster when you are finished:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" -D "$env:USERPROFILE\.rescuerelay-pg\data" stop -m fast
```

Keep the superuser password private. The application uses only `rescuerelay_app`.

Frontend (from `frontend`):

```powershell
npx vitest run
npx tsc --noEmit
npm run build
```

`npm test` runs the same Vitest suite as `npx vitest run`. `npm run build` also runs the type check first.

**End-to-end (browser) tests are not implemented.** To check the full flow by hand, follow the steps in [docs/DEMO.md](docs/DEMO.md).

## 9. Docker alternative (full stack)

From the repository root:

```bash
docker compose up --build
```

This starts PostgreSQL, builds the backend image (`backend/Dockerfile`, which runs `alembic upgrade head` and `init_db` on start), and builds the frontend image with `VITE_API_BASE_URL=http://localhost:8000/api/v1`. The frontend is then on http://localhost:5173 and the API on http://localhost:8000.

**This has not been run in the build environment,** because Docker was not installed there. Treat it as untested until someone runs it.

## 10. Documentation

- [docs/API.md](docs/API.md): every endpoint, role, request and response field, and error code.
- [docs/DEMO.md](docs/DEMO.md): the 2-minute donor-to-impact demo.
- [docs/BUSINESS.md](docs/BUSINESS.md): business hypotheses. Not validated with customers.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): components and the rescue state machine.

## 11. Troubleshooting

**Database connection failed.** The backend cannot reach the database.
- If `DATABASE_URL` in `backend/.env` points to PostgreSQL, check that the `db` container is running with `docker compose ps`, and that the host, port, user, password and database match `docker-compose.yml`.
- If you do not use Docker, remove the `DATABASE_URL` line from `backend/.env` so the SQLite default is used.

**Port in use.** Something else holds port 8000 or 5173.
- Stop the other process, or run the API on another port, for example `uvicorn app.main:app --reload --port 8001`, and open `http://localhost:8001/docs`. If you move the API, also update `VITE_API_BASE_URL` in `frontend/.env` and `CORS_ORIGINS` in `backend/.env`.
- For the frontend, Vite's port is set in `frontend/vite.config.ts`.

**Migration failure.** `alembic upgrade head` fails.
- Check that you are in `backend` with the virtual environment active.
- For a SQLite demo database only, you may delete `backend/data/rescuerelay.db` and run `alembic upgrade head` and `python -m app.seed.init_db` again. Do not delete a database that holds data you need. For PostgreSQL, do not drop tables by hand; fix the error first.

**CORS error in the browser.** Requests are blocked with a CORS message.
- `CORS_ORIGINS` in `backend/.env` must include `http://localhost:5173`. Restart the API after changing it.

**Frontend cannot reach the API.** Pages show network errors.
- Check that `frontend/.env` has `VITE_API_BASE_URL=/api/v1` for the local Vite proxy. Vite reads it at start-up, so restart `npm run dev` after changing it.
- Check that the API is running and that http://localhost:8000/api/v1/health responds.

**JWT or login problem.** You are signed out, or see `INVALID_TOKEN`.
- Log in again. Tokens expire after `ACCESS_TOKEN_EXPIRE_MINUTES` (default 60).
- `JWT_SECRET` must be the same across API restarts. If you change it, all existing tokens stop working, so log in again.
- A warning about key length means `JWT_SECRET` is shorter than 32 characters.

**Docker is not running.** `docker compose` fails with a daemon or pipe error.
- Start Docker Desktop and wait until it reports that it is running, then retry.

**Stale or confusing demo data.** Numbers or rescues look wrong.
- Run `python -m app.seed.reset_demo` from `backend` (step 7).

**npm install problem.** Install fails or `npm run dev` errors after a dependency change.
- From `frontend`, delete `node_modules`, then run `npm install` again. Keep `package-lock.json` unless you intend to change dependencies.

**Python environment.** The wrong Python or packages are used.
- Activate `backend\.venv` first, or `source .venv/bin/activate` on Linux/macOS. Then use `python -m pip install -r requirements.txt`.
- If the venv points outside the project, deactivate it, delete `backend/.venv`, and create it again (step 3).
- On Windows, if `python` opens the Store, use `py -3.12` to create the venv.

## 12. Production notes

This guide is for local demos. Before any real deployment:

- **Change `JWT_SECRET`** to a long random value. Do not reuse the example value.
- **Set `DATABASE_URL`** to your production database (PostgreSQL). Do not use the demo SQLite file.
- **Set `CORS_ORIGINS`** to your real frontend origin only.
- **Set `DEMO_MODE=false`** before initializing the production database.
- **Serve the frontend build over HTTPS.** Build with `npm run build` and serve `frontend/dist` from a web server or CDN, with the API behind HTTPS too.
