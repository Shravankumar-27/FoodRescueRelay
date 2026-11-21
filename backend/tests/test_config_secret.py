"""Tests for the JWT_SECRET guard in app.core.config.Settings.

Settings is constructed fresh inside each test (no lru_cache involved) with
_env_file=None so a developer's local .env cannot influence the result.
"""

import pytest

from app.core.config import Settings

DEFAULT_SECRET = "dev-only-change-me"
EXPECTED_MESSAGE = (
    "JWT_SECRET must be set to a unique value of at least 32 characters when DEMO_MODE is false"
)


def test_demo_mode_false_with_default_secret_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEMO_MODE", "false")
    monkeypatch.setenv("JWT_SECRET", DEFAULT_SECRET)
    with pytest.raises(ValueError, match=EXPECTED_MESSAGE):
        Settings(_env_file=None)


def test_demo_mode_false_with_40_char_secret_does_not_raise(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEMO_MODE", "false")
    monkeypatch.setenv("JWT_SECRET", "k" * 40)
    settings = Settings(_env_file=None)
    assert settings.JWT_SECRET == "k" * 40
    assert settings.DEMO_MODE is False


def test_demo_mode_true_with_default_secret_does_not_raise(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEMO_MODE", "true")
    monkeypatch.setenv("JWT_SECRET", DEFAULT_SECRET)
    settings = Settings(_env_file=None)
    assert settings.JWT_SECRET == DEFAULT_SECRET
    assert settings.DEMO_MODE is True
