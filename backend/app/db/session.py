"""Database engine, session factory and FastAPI dependency."""

from collections.abc import Iterator
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.engine import create_database_engine

engine = create_database_engine(get_settings().active_database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
