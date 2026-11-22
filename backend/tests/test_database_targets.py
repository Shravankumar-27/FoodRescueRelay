from unittest.mock import patch

import pytest
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool

from app.core.config import Settings
from app.db.engine import create_database_engine
from app.db import snapshot


POOLED = "postgresql://owner:p%40ss%25word@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT = POOLED.replace("-pooler", "")


def settings(**overrides):
    return Settings(_env_file=None, DATABASE_URL="sqlite:///data/keep-local.db", **overrides)


def test_local_remains_default_even_when_neon_url_is_present():
    config = settings(NEON_DATABASE_URL=POOLED)
    assert config.DATABASE_TARGET == "local"
    assert config.active_database_url == config.DATABASE_URL
    assert config.active_database_url.endswith("keep-local.db")


@pytest.mark.parametrize("prefix", ["postgresql://", "postgres://", "postgresql+psycopg://"])
def test_neon_urls_use_installed_driver_and_preserve_credentials_and_ssl(prefix):
    config = settings(DATABASE_TARGET="neon", NEON_DATABASE_URL=POOLED.replace("postgresql://", prefix))
    url = make_url(config.active_database_url)
    assert url.drivername == "postgresql+psycopg"
    assert url.password == "p@ss%word"
    assert url.query == {"sslmode": "require", "channel_binding": "require"}
    assert config.DATABASE_URL.endswith("keep-local.db")
    assert config.migration_database_url == config.active_database_url


def test_migrations_can_use_separate_direct_url_only_when_neon_selected():
    config = settings(DATABASE_TARGET="neon", NEON_DATABASE_URL=POOLED, NEON_DIRECT_DATABASE_URL=DIRECT)
    assert "-pooler" in config.active_database_url
    assert "-pooler" not in config.migration_database_url
    config = settings(NEON_DATABASE_URL=POOLED, NEON_DIRECT_DATABASE_URL=DIRECT)
    assert config.migration_database_url == config.DATABASE_URL


def test_missing_neon_url_fails_instead_of_falling_back_to_sqlite():
    with pytest.raises(ValueError, match="Set NEON_DATABASE_URL"):
        settings(DATABASE_TARGET="neon")


def test_missing_neon_ssl_is_added():
    config = settings(DATABASE_TARGET="neon", NEON_DATABASE_URL=POOLED.split("?")[0])
    assert make_url(config.active_database_url).query["sslmode"] == "require"


def test_bad_connection_url_errors_do_not_expose_input():
    with pytest.raises(ValueError) as error:
        settings(DATABASE_TARGET="neon", NEON_DATABASE_URL="psql 'postgresql://private-secret'")
    assert "private-secret" not in str(error.value)


def test_pooler_options_and_migration_options():
    config = settings(DATABASE_TARGET="neon", NEON_DATABASE_URL=POOLED, NEON_DIRECT_DATABASE_URL=DIRECT)
    with patch("app.db.engine.create_engine") as create:
        create_database_engine(config.active_database_url)
        assert "poolclass" not in create.call_args.kwargs
        assert create.call_args.kwargs["pool_size"] == 5
        assert create.call_args.kwargs["max_overflow"] == 5
        assert create.call_args.kwargs["pool_pre_ping"] is True
        assert create.call_args.kwargs["connect_args"] == {"connect_timeout": 15, "prepare_threshold": None}
        create_database_engine(config.migration_database_url, migrations=True)
        assert create.call_args.kwargs["poolclass"] is NullPool
        assert create.call_args.kwargs["connect_args"] == {"connect_timeout": 15}


def test_explicit_connect_timeout_is_preserved():
    config = settings(DATABASE_TARGET="neon", NEON_DATABASE_URL=POOLED + "&connect_timeout=30")
    with patch("app.db.engine.create_engine") as create:
        create_database_engine(config.active_database_url)
        assert "connect_timeout" not in create.call_args.kwargs["connect_args"]
        assert create.call_args.args[0].query["connect_timeout"] == "30"


def test_sqlite_still_enforces_foreign_keys(tmp_path):
    engine = create_database_engine(f"sqlite:///{tmp_path / 'isolated.db'}")
    try:
        with engine.connect() as connection:
            assert connection.exec_driver_sql("PRAGMA foreign_keys").scalar() == 1
    finally:
        engine.dispose()


@pytest.mark.parametrize("event", ["commit", "pull", "push"])
def test_git_hooks_skip_neon_without_touching_sqlite_or_git(monkeypatch, capsys, event):
    config = settings(DATABASE_TARGET="neon", NEON_DATABASE_URL=POOLED)
    monkeypatch.setattr("app.core.config.get_settings", lambda: config)
    monkeypatch.setattr("sys.argv", ["snapshot", "hook", event])
    with patch.object(snapshot, "dump_database") as dump, patch.object(snapshot.subprocess, "run") as git:
        snapshot.main()
        dump.assert_not_called()
        git.assert_not_called()
    assert "skipped" in capsys.readouterr().out
