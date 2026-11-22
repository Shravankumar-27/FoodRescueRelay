from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, JSON, MetaData, String, Table, Uuid, create_engine, select
from sqlalchemy.exc import IntegrityError

from app.db.copy_local_to_neon import copy_records, local_snapshot
from app.db.snapshot import digest, dump_database


def schema():
    metadata = MetaData()
    Table("parents", metadata, Column("id", Uuid, primary_key=True), Column("name", String, nullable=False))
    Table("children", metadata, Column("id", Uuid, primary_key=True), Column("parent_id", Uuid, ForeignKey("parents.id")),
          Column("details", JSON), Column("active", Boolean), Column("created_at", DateTime(timezone=True)))
    return metadata


def test_copy_preserves_typed_records_and_never_changes_source(tmp_path):
    metadata = schema()
    path = tmp_path / "source.db"
    source = create_engine(f"sqlite:///{path}")
    destination = create_engine(f"sqlite:///{tmp_path / 'target.db'}")
    try:
        for engine in (source, destination):
            metadata.create_all(engine)
        parent, child = uuid4(), uuid4()
        with source.begin() as connection:
            connection.execute(metadata.tables["parents"].insert(), {"id": parent, "name": "Kitchen's table"})
            connection.execute(metadata.tables["children"].insert(), {"id": child, "parent_id": parent,
                "details": {"diet": ["VEG"], "notes": "Hyderabad · meals"}, "active": True,
                "created_at": datetime(2026, 11, 22, 10, tzinfo=timezone.utc)})
        before = digest(dump_database(path))
        with local_snapshot(path) as snapshot:
            assert copy_records(snapshot, destination, list(metadata.sorted_tables)) == {"parents": 1, "children": 1}
        assert digest(dump_database(path)) == before
        with destination.connect() as connection:
            row = connection.execute(select(metadata.tables["children"])).mappings().one()
            assert row["id"] == child and row["parent_id"] == parent and row["active"] is True
            assert row["details"]["notes"] == "Hyderabad · meals"
        with local_snapshot(path) as snapshot, pytest.raises(RuntimeError, match="already contains"):
            copy_records(snapshot, destination, list(metadata.sorted_tables))
    finally:
        source.dispose()
        destination.dispose()


def test_failed_insert_rolls_back_all_tables(tmp_path):
    metadata = schema()
    source = create_engine(f"sqlite:///{tmp_path / 'source.db'}")
    destination = create_engine(f"sqlite:///{tmp_path / 'target.db'}")
    try:
        for engine in (source, destination):
            metadata.create_all(engine)
        with source.begin() as connection:
            connection.execute(metadata.tables["parents"].insert(), {"id": uuid4(), "name": "Original"})
            connection.execute(metadata.tables["children"].insert(), {"id": uuid4(), "active": True})
        with destination.begin() as connection:
            connection.exec_driver_sql("CREATE TRIGGER reject_child BEFORE INSERT ON children BEGIN SELECT RAISE(ABORT, 'test failure'); END")
        with pytest.raises(IntegrityError):
            copy_records(source, destination, list(metadata.sorted_tables))
        with destination.connect() as connection:
            assert connection.execute(select(metadata.tables["parents"])).all() == []
    finally:
        source.dispose()
        destination.dispose()
