# Local SQLite and Neon PostgreSQL

Keep your existing `DATABASE_URL` in **`backend/.env`**. Add these settings below it:

```dotenv
DATABASE_TARGET=local
NEON_DATABASE_URL=
NEON_DIRECT_DATABASE_URL=
```

Paste the **pooled connection URL from Neon** into `NEON_DATABASE_URL`. Copy just
the URL, not the `psql` command. For example (replace every placeholder):

```dotenv
NEON_DATABASE_URL="postgresql://USER:PASSWORD@ep-YOUR-ENDPOINT-pooler.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DATABASE_TARGET=neon
```

`postgresql://` URLs are automatically adapted to the installed Psycopg 3 driver.
SSL and channel-binding options from Neon are preserved. Each API/worker process
reuses up to 5 client connections, with 5 temporary overflow connections. Neon's
pooler continues to manage the server connections. This avoids opening a fresh
TLS connection for each request. Connections are checked before reuse and recycled
after 5 minutes; Alembic uses no persistent application pool.
See [Neon's SQLAlchemy guide](https://neon.com/docs/guides/sqlalchemy) and
[connection pooling](https://neon.com/docs/connect/connection-pooling).

Dashboard reads batch capacity, trust and impact queries. Local synthetic-fixture
regression checks enforce 6 SQL statements for nearby receivers, 8 for rankings,
3 for contribution summaries, 2 for inbox summaries and 8 for steady discovery
polling. The nearby/ranking limits also pass with 40 additional receivers. These
are query-count budgets, not promises of hosted response times; network latency,
database load and cold starts still affect the first request.

The frontend shares simultaneous GET requests only within the same account and
URL. Writes invalidate that sharing window. React Query keeps reads fresh for
10 seconds while existing live polling and mutation invalidations remain active.

Only the backend reads these credentials. `backend/.env` is Git-ignored. Do not
put the URL in frontend environment variables or the committed `.env.example`.

## Start against Neon

Stop the API and dispatch worker, select `DATABASE_TARGET=neon`, then run from
the backend directory with its virtual environment activated:

```powershell
python -m pip install -r requirements.txt
python -m app.db.check
python -m alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Run `python -m app.workers.dispatch_worker` in a second backend terminal if using
the worker. Restart both processes whenever you change the target. The frontend
continues to call the same API; it needs no database URL.

Migrations create the schema in the selected database. You can optionally paste
the direct connection URL for the **same Neon branch and database** into
`NEON_DIRECT_DATABASE_URL`; Alembic uses it while the app keeps using the pooler.
When this is blank, Alembic uses the pooled URL too.

An empty Neon database has no accounts or rescues. For the project's generated
development accounts and listings, run `python -m app.seed.init_db` once after
migrations with `DEMO_MODE=true`. This creates generated data in Neon; it does
**not** upload your local records. Do not use `--reset` on a database you want to
keep. For a production deployment use `DEMO_MODE=false` and a strong `JWT_SECRET`.

### Copy your existing local records instead

To populate an empty Neon database with the exact data from the SQLite file in
`DATABASE_URL`, select Neon and run after migrations:

```powershell
python -m app.db.copy_local_to_neon
```

The importer opens SQLite read-only, preserves IDs, passwords, messages, dates
and relationships, and verifies every field before committing one transaction.
It refuses a nonempty Neon database and never resets either database. Do not seed
Neon first if you intend to use this copy. Keep the same `JWT_SECRET` to read
existing encrypted pickup codes. Later edits remain independent; this is a
one-time copy, not ongoing synchronization.

### Worker terminal

The worker is a foreground process and stays running until Ctrl+C. It checks
dispatch every five seconds and does not populate database tables. It now logs
startup, processed expired offers, and a healthy heartbeat once per minute.
Restart an already-running worker to load these logging changes. Use
`python -m app.workers.dispatch_worker --once` for a single check that exits.

## Switch back to local

Set `DATABASE_TARGET=local` and restart the API and worker. Your original
`DATABASE_URL` is used again. No SQLite file is deleted, replaced or imported by
switching targets. The backend loads `backend/.env` consistently even when run
from the repository root.

These are independent databases: the app uses **one target at a time**, with no
automatic replication or fallback. A failed Neon connection produces an error
instead of writing the operation to SQLite. Existing SQLite Git snapshot hooks
skip synchronization while Neon is selected; online records are never exported
to the repository by those hooks.

The existing Docker Compose stack still uses its own PostgreSQL service by
default. To use Neon inside Docker, pass `DATABASE_TARGET=neon`,
`NEON_DATABASE_URL`, and optionally `NEON_DIRECT_DATABASE_URL` to the backend
container as environment variables. A host `backend/.env` is not automatically
loaded into that container.
