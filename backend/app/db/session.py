"""Database engine, session factory and FastAPI dependency."""

from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

_database_url = get_settings().DATABASE_URL
_SQLITE_PREFIX = "sqlite:///"

if _database_url.startswith("sqlite"):
    _sqlite_file = _database_url[len(_SQLITE_PREFIX):]
    if _sqlite_file and _sqlite_file != ":memory:":
        Path(_sqlite_file).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        _database_url,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    engine = create_engine(_database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
