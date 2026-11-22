# Share the same database through Git

When `DATABASE_TARGET=neon`, Git hooks skip database synchronization. Your local
SQLite database and shared snapshot remain intact. See [Neon setup](NEON_DATABASE.md)
to switch between the two independent databases.

The versioned dataset is `backend/data/shared.sql`. The running SQLite database,
WAL files, local backups, `.env`, and sync state stay out of Git. The SQL snapshot
contains the complete development dataset, including accounts, password hashes,
private addresses, messages, deliveries, and appreciation records. Everyone with
repository access can read it. Keep real personal data and production databases
out of this shared development workflow.

## One-time setup on every clone

After installing backend dependencies, activate its virtual environment and run:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m app.db.snapshot install
```

This restores the committed dataset and installs this repository's Git hooks.
Git deliberately does not activate hooks automatically on clone. On macOS/Linux,
activate with `source .venv/bin/activate`; the commands are otherwise identical.
Existing custom Git hooks are preserved: installation stops rather than replacing
their configuration.

If you already have different local data, installation stops. To intentionally
use the shared version, stop the API and dispatch worker, then run
`python -m app.db.snapshot install --force`. The previous dataset is saved in
`backend/data/backups/` before replacement.

Start the backend with `uvicorn app.main:app --reload --port 8000`. Do not reset or
reseed after importing if you want exactly the committed data. Existing timestamps
are preserved; a pickup deadline can expire while the repository is in transit.

## Everyday collaboration

1. Make your changes in the app.
2. Stop the API/worker before synchronizing to avoid more writes after the snapshot.
3. Commit and push normally. The pre-commit hook exports all committed SQLite
   transactions, including WAL data, and stages the SQL snapshot with your commit.
   The pre-push hook catches data changed since that commit.
4. Your teammate pulls. The post-merge hook restores the new snapshot. Rebase and
   branch checkout hooks also restore the corresponding version.
5. Restart the app. Your teammate can edit, commit, and push back the same way.

For a **database-only commit**, run `python -m app.db.snapshot export` first,
then `git add data/shared.sql` and `git commit` from the backend directory.
For ordinary code commits, the pre-commit hook exports automatically.

This shares whole database versions, not simultaneous edits. If both teammates
change data independently, synchronization stops instead of overwriting unshared
work. The snapshot uses a binary merge rule to prevent Git from splicing together
SQL from incompatible database versions. Resolve a conflict by choosing the
intended dataset version, then run `python -m app.db.snapshot import --force`;
your prior local database remains in a backup. Review and reapply any desired
local changes before committing.

## Manual commands and recovery

Run these from the backend directory with its environment active:

```text
python -m app.db.snapshot status
python -m app.db.snapshot export
python -m app.db.snapshot import
python -m app.db.snapshot import --force
```

Each import validates the database and foreign keys before writing. Replacements
use SQLite's transactional backup API and save the previous data locally. To
recover a backup without replacing the shared snapshot, use the same helper:

```python
from pathlib import Path
from app.db.snapshot import import_snapshot
import_snapshot(Path("data/rescuerelay.db").resolve(),
                Path("data/backups/before-sync-<timestamp>.sql"),
                Path("data/.snapshot-state.json"), force=True)
```

Recovery leaves the shared SQL file untouched. Export after reviewing recovered
data if you want to share it again.

Pickup display codes are encrypted using `JWT_SECRET`. Teammates needing to view
existing active pickup codes must use the same development secret in their local
`.env` files, shared separately from Git. Login passwords keep working because
their hashes are included; sessions should be signed in again on the other machine.

The hook workflow requires `DEMO_MODE=true` and a local file-based SQLite database.
PostgreSQL/Docker databases use their own backup/restore tooling. No database or
repository data is pushed to a remote by the setup or sync commands.
