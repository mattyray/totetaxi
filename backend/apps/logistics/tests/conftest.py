# apps/logistics/tests/conftest.py
"""
Test configuration for logistics app.
Ensures Onfleet integration always uses mock mode during tests.
"""
import pytest
from django.conf import settings


@pytest.fixture(scope='session', autouse=True)
def force_onfleet_mock_mode():
    """
    Force ONFLEET_MOCK_MODE to True for all tests in this module.

    This prevents tests from accidentally hitting the real Onfleet API,
    which would cause:
    - Geocoding errors with test addresses like "123 Main St"
    - Unnecessary API calls that slow down tests
    - Potential API quota usage
    """
    # Store original value
    original_value = getattr(settings, 'ONFLEET_MOCK_MODE', True)

    # Force mock mode ON for all tests
    settings.ONFLEET_MOCK_MODE = True

    yield

    # Restore original value after all tests
    settings.ONFLEET_MOCK_MODE = original_value


@pytest.fixture(autouse=True)
def ensure_mock_mode(force_onfleet_mock_mode):
    """
    Ensure each test runs with mock mode enabled.
    This is a safety check that runs before every test.
    """
    assert settings.ONFLEET_MOCK_MODE is True, \
        "ONFLEET_MOCK_MODE must be True during tests to prevent real API calls"
