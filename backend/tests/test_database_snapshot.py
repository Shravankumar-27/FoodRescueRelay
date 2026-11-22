import sqlite3

import pytest

from app.db.snapshot import dump_database, export_snapshot, import_snapshot


def make_database(path):
    with sqlite3.connect(path) as db:
        db.executescript("CREATE TABLE donors(id INTEGER PRIMARY KEY, name TEXT); "
                         "CREATE TABLE rescues(id INTEGER PRIMARY KEY, donor_id INTEGER REFERENCES donors(id));")
        db.execute("INSERT INTO donors VALUES (1, ?)", ("Kitchen's table · Hyderabad",))
        db.execute("INSERT INTO rescues VALUES (1, 1)")


def test_snapshot_round_trip_preserves_records_and_wal(tmp_path):
    original, shared, state = [tmp_path / name for name in ("original.db", "shared.sql", "state.json")]
    make_database(original)
    with sqlite3.connect(original) as live:
        live.execute("PRAGMA journal_mode=WAL")
        live.execute("INSERT INTO donors VALUES (2, 'Community kitchen')")
        live.commit()
        export_snapshot(original, shared, state)
        restored = tmp_path / "friend.db"
        import_snapshot(restored, shared, tmp_path / "friend-state.json")
        assert dump_database(restored) == dump_database(original)
        with sqlite3.connect(restored) as db:
            assert db.execute("SELECT count(*) FROM donors").fetchone()[0] == 2


def test_local_edits_are_protected_and_force_creates_recoverable_backup(tmp_path):
    database, snapshot, state = [tmp_path / name for name in ("local.db", "shared.sql", "state.json")]
    make_database(database)
    export_snapshot(database, snapshot, state)
    with sqlite3.connect(database) as db:
        db.execute("INSERT INTO donors VALUES (2, 'Local addition')")
    local = dump_database(database)
    with pytest.raises(RuntimeError, match="unshared changes"):
        import_snapshot(database, snapshot, state)
    assert dump_database(database) == local
    backup = import_snapshot(database, snapshot, state, force=True)
    assert backup.read_text(encoding="utf-8") == local
    assert dump_database(database) == snapshot.read_text(encoding="utf-8")


def test_remote_changes_restore_but_cannot_be_overwritten_by_export(tmp_path):
    database, snapshot, state = [tmp_path / name for name in ("local.db", "shared.sql", "state.json")]
    make_database(database)
    export_snapshot(database, snapshot, state)
    changed = snapshot.read_text(encoding="utf-8").replace("COMMIT;", "INSERT INTO donors VALUES (2, 'Remote addition');\nCOMMIT;")
    snapshot.write_text(changed, encoding="utf-8")
    with pytest.raises(RuntimeError, match="shared snapshot changed"):
        export_snapshot(database, snapshot, state)
    import_snapshot(database, snapshot, state)
    with sqlite3.connect(database) as db:
        assert db.execute("SELECT name FROM donors WHERE id=2").fetchone()[0] == "Remote addition"
    export_snapshot(database, snapshot, state)


def test_invalid_snapshot_does_not_touch_existing_database(tmp_path):
    database, snapshot, state = [tmp_path / name for name in ("local.db", "shared.sql", "state.json")]
    make_database(database)
    export_snapshot(database, snapshot, state)
    before = dump_database(database)
    snapshot.write_text(before.replace("COMMIT;", "INSERT INTO rescues VALUES (2, 999);\nCOMMIT;"), encoding="utf-8")
    with pytest.raises(RuntimeError, match="broken relationships"):
        import_snapshot(database, snapshot, state)
    assert dump_database(database) == before
