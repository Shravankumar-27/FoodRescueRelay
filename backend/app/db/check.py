"""Read-only connectivity check: python -m app.db.check. Never prints credentials."""
import sys

from sqlalchemy import text

from app.core.config import get_settings
from app.db.engine import create_database_engine


def main():
    try:
        settings = get_settings()
        engine = create_database_engine(settings.active_database_url)
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            print(f"Connected successfully: {settings.DATABASE_TARGET} ({engine.dialect.name}).")
        finally:
            engine.dispose()
    except Exception:
        # Driver exceptions may include usernames, hosts or connection details.
        print("Database connection failed. Check backend/.env, credentials, SSL options and network access.", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
