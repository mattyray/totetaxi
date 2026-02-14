"""Test configuration for assistant app."""
import pytest


@pytest.fixture(autouse=True)
def mock_anthropic_api_key(monkeypatch):
    """Ensure tests don't need a real API key."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-not-real")
