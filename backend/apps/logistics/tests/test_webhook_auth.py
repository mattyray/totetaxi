# backend/apps/logistics/tests/test_webhook_auth.py
"""
Tests for CRITICAL finding C3:
- Onfleet webhook must verify HMAC signature
- Missing / invalid signature must return 401
- Valid signature must be accepted
- GET verification (check= param) still works without signature

These tests should FAIL before the fix and PASS after.
"""
import hmac
import hashlib
import json
import pytest
from rest_framework.test import APIClient


WEBHOOK_URL = '/api/staff/logistics/webhook/'
WEBHOOK_SECRET = 'aabbccdd11223344aabbccdd11223344aabbccdd11223344aabbccdd11223344'


@pytest.fixture(autouse=True)
def set_webhook_secret(settings):
    settings.ONFLEET_WEBHOOK_SECRET = WEBHOOK_SECRET


def _sign_payload(payload_bytes, secret=WEBHOOK_SECRET):
    """Compute HMAC-SHA512 signature matching Onfleet's scheme."""
    return hmac.new(
        bytes.fromhex(secret),
        payload_bytes,
        hashlib.sha512,
    ).hexdigest()


@pytest.mark.django_db
class TestOnfleetWebhookAuth:
    """C3: Onfleet webhook POST must verify HMAC signature."""

    def test_rejects_missing_signature(self):
        """POST without X-Onfleet-Signature header must return 401."""
        client = APIClient()
        payload = json.dumps({
            'triggerId': 6,
            'taskId': 'fake_task',
            'data': {'task': {'id': 'fake_task'}},
        })

        response = client.post(
            WEBHOOK_URL,
            data=payload,
            content_type='application/json',
        )

        assert response.status_code == 401

    def test_rejects_invalid_signature(self):
        """POST with wrong signature must return 401."""
        client = APIClient()
        payload = json.dumps({
            'triggerId': 6,
            'taskId': 'fake_task',
            'data': {'task': {'id': 'fake_task'}},
        })

        response = client.post(
            WEBHOOK_URL,
            data=payload,
            content_type='application/json',
            HTTP_X_ONFLEET_SIGNATURE='invalid_signature_value',
        )

        assert response.status_code == 401

    def test_accepts_valid_signature(self, settings):
        """POST with correct HMAC-SHA512 signature must be processed."""
        settings.ONFLEET_MOCK_MODE = True
        client = APIClient()
        payload_bytes = json.dumps({
            'triggerId': 6,
            'taskId': 'task_valid_sig',
            'data': {'task': {'id': 'task_valid_sig'}},
        }).encode('utf-8')

        sig = _sign_payload(payload_bytes)

        response = client.post(
            WEBHOOK_URL,
            data=payload_bytes,
            content_type='application/json',
            HTTP_X_ONFLEET_SIGNATURE=sig,
        )

        # Should be 200 (processed), not 401
        assert response.status_code == 200

    def test_get_verification_still_works_without_signature(self):
        """GET /webhook/?check=value must still work (Onfleet verification handshake)."""
        client = APIClient()
        response = client.get(WEBHOOK_URL, {'check': 'abc123'})

        assert response.status_code == 200
        assert response.content.decode() == 'abc123'

    def test_rejects_empty_secret_config(self, settings):
        """If ONFLEET_WEBHOOK_SECRET is empty, webhook POST must be rejected."""
        settings.ONFLEET_WEBHOOK_SECRET = ''

        client = APIClient()
        payload = json.dumps({
            'triggerId': 6,
            'taskId': 'fake_task',
            'data': {'task': {'id': 'fake_task'}},
        })

        response = client.post(
            WEBHOOK_URL,
            data=payload,
            content_type='application/json',
            HTTP_X_ONFLEET_SIGNATURE='anything',
        )

        assert response.status_code == 401
