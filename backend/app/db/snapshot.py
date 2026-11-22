"""Version the shared SQLite dataset without checking in a live database.

Run from backend: python -m app.db.snapshot {export,import,status,install}
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sqlite3
import subprocess
import tempfile
from datetime import datetime, timezone


def digest(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def dump_database(database: Path) -> str:
    """Read a consistent snapshot, including committed WAL data."""
    with sqlite3.connect(database.as_uri() + "?mode=ro", uri=True) as source:
        with sqlite3.connect(":memory:") as copy:
            source.backup(copy)
            return "\n".join(copy.iterdump()) + "\n"


def write_atomic(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="\n",
                                     dir=path.parent, delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(content)
    try:
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def read_state(state: Path) -> dict:
    return json.loads(state.read_text(encoding="utf-8")) if state.exists() else {}


def export_snapshot(database: Path, snapshot: Path, state: Path) -> None:
    previous = read_state(state)
    if snapshot.exists() and previous.get("snapshot") != digest(snapshot.read_text(encoding="utf-8")):
        # A pull or checkout changed the shared version. Never overwrite it with stale local data.
        raise RuntimeError("The shared snapshot changed. Run python -m app.db.snapshot import first.")
    content = dump_database(database)
    write_atomic(snapshot, content)
    write_atomic(state, json.dumps({"snapshot": digest(content), "database": digest(content)}))


def import_snapshot(database: Path, snapshot: Path, state: Path, *, force: bool = False) -> Path | None:
    content = snapshot.read_text(encoding="utf-8")
    previous = read_state(state)
    local = dump_database(database) if database.exists() else None
    if local == content:
        write_atomic(state, json.dumps({"snapshot": digest(content), "database": digest(local)}))
        return None
    if local is not None and digest(local) != previous.get("database") and not force:
        raise RuntimeError("Local database has unshared changes. Export and commit them before pulling, "
                           "or stop the app and run python -m app.db.snapshot import --force "
                           "to restore the shared version with a local backup.")
    # Validate everything before opening the destination for writing.
    with sqlite3.connect(":memory:") as restored:
        restored.executescript(content)
        if restored.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise RuntimeError("Snapshot integrity check failed.")
        if restored.execute("PRAGMA foreign_key_check").fetchall():
            raise RuntimeError("Snapshot contains broken relationships.")
        backup = None
        database.parent.mkdir(parents=True, exist_ok=True)
        if local is not None:
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
            backup = database.parent / "backups" / f"before-sync-{stamp}.sql"
            write_atomic(backup, local)
        # SQLite's backup API replaces data transactionally, including when WAL is enabled.
        with sqlite3.connect(database, timeout=15) as target:
            restored.backup(target)
    write_atomic(state, json.dumps({"snapshot": digest(content), "database": digest(dump_database(database))}))
    return backup


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("export", "import", "status", "install", "check", "hook"))
    parser.add_argument("hook_event", nargs="?", choices=("commit", "pull", "push"))
    parser.add_argument("--force", action="store_true", help="Restore shared data after backing up local changes")
    args = parser.parse_args()
    from app.core.config import get_settings
    from sqlalchemy.engine import make_url
    settings = get_settings()
    url = make_url(settings.active_database_url)
    is_hook = args.action == "hook"
    if is_hook:
        if args.hook_event is None:
            parser.error("hook requires commit, pull or push")
        if settings.DATABASE_TARGET == "neon" or url.get_backend_name() != "sqlite" or not settings.DEMO_MODE:
            print("Local database Git sync skipped for the selected database.")
            return
        args.action = {"commit": "export", "pull": "import", "push": "check"}[args.hook_event]
    if url.get_backend_name() != "sqlite" or not url.database or url.database == ":memory:":
        parser.exit(1, "Git dataset sharing requires a file-based SQLite database.\n")
    if not settings.DEMO_MODE:
        parser.exit(1, "Git dataset sharing is enabled only for the development dataset (DEMO_MODE=true).\n")
    root = Path(__file__).resolve().parents[3]
    database = Path(url.database).resolve()
    snapshot = root / "backend/data/shared.sql"
    state = database.parent / ".snapshot-state.json"
    try:
        if args.action == "export":
            export_snapshot(database, snapshot, state)
            if is_hook:
                subprocess.run(["git", "add", "--", "backend/data/shared.sql"], cwd=root, check=True)
            print("Shared dataset exported: backend/data/shared.sql")
        elif args.action == "import":
            backup = import_snapshot(database, snapshot, state, force=args.force)
            print("Shared dataset restored." + (f" Previous data: {backup}" if backup else ""))
        elif args.action == "install":
            existing = subprocess.run(["git", "config", "--get", "core.hooksPath"], cwd=root,
                                      text=True, capture_output=True).stdout.strip()
            if existing and existing != ".githooks":
                raise RuntimeError(f"Existing hooks at {existing}; integrate .githooks manually to preserve them.")
            import_snapshot(database, snapshot, state, force=args.force)
            for hook in (root / ".githooks").iterdir():
                if hook.is_file():
                    hook.chmod(hook.stat().st_mode | 0o111)
            subprocess.run(["git", "config", "core.hooksPath", ".githooks"], cwd=root, check=True)
            print("Database sharing installed for this clone. Commit exports; pull restores. Restart the app after pulling.")
        else:
            matches = database.exists() and snapshot.exists() and dump_database(database) == snapshot.read_text(encoding="utf-8")
            if args.action == "check" and not matches:
                raise RuntimeError("Database differs from the shared snapshot. Commit database changes before pushing.")
            if is_hook:
                tracked = subprocess.run(["git", "ls-files", "--error-unmatch", "backend/data/shared.sql"],
                                         cwd=root, capture_output=True).returncode == 0
                clean = subprocess.run(["git", "diff", "--quiet", "HEAD", "--", "backend/data/shared.sql"], cwd=root).returncode == 0
                if not tracked or not clean:
                    raise RuntimeError("Commit backend/data/shared.sql before pushing so your teammate receives the current dataset.")
            print("Database matches the shared snapshot." if matches else "Database has changes to share or restore.")
    except (RuntimeError, OSError, sqlite3.Error, ValueError) as error:
        parser.exit(1, f"Database sync: {error}\n")


if __name__ == "__main__":
    main()
