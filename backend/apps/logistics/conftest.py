# apps/logistics/conftest.py
"""
Pytest fixtures for logistics app tests.
Ensures Onfleet always runs in mock mode during tests.
"""
import pytest
from django.conf import settings


@pytest.fixture(autouse=True)
def force_onfleet_mock_mode(settings):
    """
    Automatically force Onfleet mock mode for ALL logistics tests.
    
    This is a safety net that prevents accidental real API calls during testing,
    even if environment variables or settings.py are misconfigured.
    
    This fixture runs automatically for every test in the logistics app.
    """
    settings.ONFLEET_MOCK_MODE = True
    settings.ONFLEET_ENVIRONMENT = 'sandbox'
    yield


@pytest.fixture
def onfleet_service():
    """
    Provides a configured OnfleetService instance for testing.
    Always uses mock mode.
    """
    from apps.logistics.services import OnfleetService
    service = OnfleetService()
    assert service.mock_mode is True, "OnfleetService must be in mock mode for tests!"
    return service


@pytest.fixture
def onfleet_integration():
    """
    Provides a configured ToteTaxiOnfleetIntegration instance for testing.
    Always uses mock mode.
    """
    from apps.logistics.services import ToteTaxiOnfleetIntegration
    integration = ToteTaxiOnfleetIntegration()
    assert integration.onfleet.mock_mode is True, "Onfleet integration must be in mock mode for tests!"
    return integration