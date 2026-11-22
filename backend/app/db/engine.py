"""Connection options shared by the API, worker and migrations."""
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool


def create_database_engine(database_url: str, *, migrations: bool = False):
    url = make_url(database_url)
    if url.get_backend_name() == "sqlite":
        if url.database and url.database != ":memory:":
            Path(url.database).parent.mkdir(parents=True, exist_ok=True)
        engine = create_engine(url, connect_args={"check_same_thread": False})

        @event.listens_for(engine, "connect")
        def enable_foreign_keys(connection, _record):
            connection.execute("PRAGMA foreign_keys=ON")
        return engine

    options = {"pool_pre_ping": True}
    connect_args = {}
    pooled = "-pooler" in (url.host or "")
    if url.drivername == "postgresql+psycopg":
        if "connect_timeout" not in url.query:
            connect_args["connect_timeout"] = 15
        if pooled:
            # PgBouncer owns the server pool; avoid session-scoped prepared statements.
            connect_args["prepare_threshold"] = None
    if migrations:
        options["poolclass"] = NullPool
    else:
        # Reuse a bounded set of TLS connections to PgBouncer as well as direct
        # PostgreSQL. PgBouncer pools server sessions, not our client handshakes.
        options.update(pool_size=5, max_overflow=5, pool_timeout=15, pool_recycle=300, pool_use_lifo=True)
    return create_engine(url, connect_args=connect_args, **options)
