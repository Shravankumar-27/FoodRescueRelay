"""Copy local SQLite records into an empty Neon database without changing SQLite.

Run once from backend: python -m app.db.copy_local_to_neon
"""
from contextlib import closing, contextmanager
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sqlite3
import sys
from uuid import UUID

from sqlalchemy import create_engine, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.config import get_settings
from app.db.base import Base
from app.db.engine import create_database_engine


@contextmanager
def local_snapshot(path: Path):
    """Read a consistent committed view, including WAL, through a read-only handle."""
    memory = sqlite3.connect(":memory:")
    engine = None
    try:
        with closing(sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)) as source:
            source.backup(memory)
        engine = create_engine("sqlite://", creator=lambda: memory, poolclass=StaticPool)
        yield engine
    finally:
        if engine is not None:
            engine.dispose()
        else:
            memory.close()


def _json_value(value):
    if isinstance(value, datetime):
        return value.replace(tzinfo=timezone.utc).isoformat() if value.tzinfo is None else value.astimezone(timezone.utc).isoformat()
    if isinstance(value, UUID):
        return str(value)
    raise TypeError(f"Unsupported database value type: {type(value).__name__}")


def _fingerprint(rows):
    serialized = sorted(json.dumps(dict(row), sort_keys=True, default=_json_value, ensure_ascii=False) for row in rows)
    return hashlib.sha256("\n".join(serialized).encode("utf-8")).hexdigest()


def copy_records(source, destination, tables):
    """One atomic import; refuse nonempty targets and verify every copied field."""
    with source.connect() as connection:
        records = {table.name: [dict(row) for row in connection.execute(select(table)).mappings()] for table in tables}
    # SQLite stores UTC timestamps without timezone offsets. Preserve their instant in Postgres.
    for rows in records.values():
        for row in rows:
            for key, value in row.items():
                if isinstance(value, datetime) and value.tzinfo is None:
                    row[key] = value.replace(tzinfo=timezone.utc)
    with destination.begin() as connection:
        if destination.dialect.name == "postgresql":
            connection.execute(text("SET LOCAL lock_timeout = '15s'"))
            connection.execute(text("SET LOCAL statement_timeout = '90s'"))
            names = ", ".join(destination.dialect.identifier_preparer.quote(table.name) for table in tables)
            connection.execute(text(f"LOCK TABLE {names} IN SHARE ROW EXCLUSIVE MODE"))
        for table in tables:
            if connection.execute(select(table).limit(1)).first() is not None:
                raise RuntimeError("Neon already contains application records. Nothing was overwritten; automatic merging is not supported.")
        for table in tables:
            rows = records[table.name]
            for offset in range(0, len(rows), 250):
                connection.execute(table.insert(), rows[offset:offset + 250])
            copied = connection.execute(select(table)).mappings().all()
            if _fingerprint(copied) != _fingerprint(rows):
                raise RuntimeError(f"Verification failed for {table.name}; the import was rolled back.")
    return {name: len(rows) for name, rows in records.items()}


def main():
    try:
        settings = get_settings()
        if settings.DATABASE_TARGET != "neon":
            raise RuntimeError("Set DATABASE_TARGET=neon and NEON_DATABASE_URL in backend/.env first.")
        source_url = make_url(settings.DATABASE_URL)
        if source_url.get_backend_name() != "sqlite" or not source_url.database or source_url.database == ":memory:":
            raise RuntimeError("DATABASE_URL must identify the existing local SQLite file.")
        path = Path(source_url.database).resolve()
        if not path.is_file():
            raise RuntimeError("Local SQLite database not found. No database was created or changed.")
        destination = create_database_engine(settings.migration_database_url, migrations=True)
        try:
            with local_snapshot(path) as source:
                counts = copy_records(source, destination, list(Base.metadata.sorted_tables))
        finally:
            destination.dispose()
        print(f"Copied and verified {sum(counts.values())} records across {len(counts)} tables. Local SQLite was opened read-only.")
        for table, count in counts.items():
            print(f"  {table}: {count}")
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
    except (SQLAlchemyError, sqlite3.Error, OSError, ValueError, TypeError):
        print("Import failed. Check connectivity, schema migrations and the local database. No partial import was committed.", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
