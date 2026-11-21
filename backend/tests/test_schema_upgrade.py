"""Old demo databases upgrade without dropping organizations or rejecting new diets."""
import importlib.util
import uuid
from datetime import datetime, timezone
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect, MetaData, Table, select
from app.db.upgrade import upgrade_schema


def test_legacy_schema_upgrade_preserves_rows_and_is_repeatable(tmp_path):
    engine = create_engine(f"sqlite:///{(tmp_path / 'legacy.db').as_posix()}")
    with engine.begin() as connection:
        with Operations.context(MigrationContext.configure(connection)):
            from pathlib import Path
            path = Path(__file__).resolve().parents[1] / "alembic" / "versions" / "0001_initial.py"
            spec = importlib.util.spec_from_file_location("legacy_migration", path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            module.upgrade()
        organizations = Table("organizations", MetaData(), autoload_with=connection)
        org_id = uuid.uuid4().hex
        now = datetime.now(timezone.utc)
        connection.execute(organizations.insert().values(id=org_id, name="Legacy synthetic partner", organization_type="NGO", verification_status="VERIFIED", locality="Hyderabad", latitude=17.44, longitude=78.38, reliability=.5, created_at=now, updated_at=now))
        upgrade_schema(connection)
        upgrade_schema(connection)
        assert connection.scalar(select(organizations.c.name).where(organizations.c.id == org_id)) == "Legacy synthetic partner"
        assert "accepted_dietary_types" in {c["name"] for c in inspect(connection).get_columns("receiver_capacities")}
        checks = inspect(connection).get_check_constraints("food_items")
        assert any("RAW_VEGAN" in c["sqltext"] for c in checks)
    engine.dispose()
