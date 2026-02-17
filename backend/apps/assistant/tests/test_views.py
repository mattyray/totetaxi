"""
Tests for assistant views — SSE endpoint with mocked agent.
"""
import json
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()

# Patch target: create_agent is lazily imported inside the view method,
# so we patch it at the source module (apps.assistant.graph).
PATCH_CREATE_AGENT = "apps.assistant.graph.create_agent"


def _make_updates_stream(events):
    """Build a mock stream in stream_mode='updates' format.

    Each event is a dict like {"agent": {"messages": [msg]}} or
    {"tools": {"messages": [msg]}}.
    """
    return iter(events)


@pytest.mark.django_db
class TestHealthCheckView(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_check_with_key(self):
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}):
            response = self.client.get("/api/assistant/health/")
        assert response.status_code == 200
        assert response.data["status"] == "ok"

    def test_health_check_without_key(self):
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": ""}, clear=False):
            response = self.client.get("/api/assistant/health/")
        assert response.status_code == 200
        assert response.data["status"] == "degraded"


@pytest.mark.django_db
class TestChatView(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_empty_message_rejected(self):
        response = self.client.post(
            "/api/assistant/chat/",
            {"message": "", "thread_id": "test"},
            format="json",
        )
        assert response.status_code == 400
        assert "required" in response.data["error"].lower()

    def test_missing_message_rejected(self):
        response = self.client.post(
            "/api/assistant/chat/",
            {"thread_id": "test"},
            format="json",
        )
        assert response.status_code == 400

    def test_too_long_message_rejected(self):
        response = self.client.post(
            "/api/assistant/chat/",
            {"message": "x" * 501, "thread_id": "test"},
            format="json",
        )
        assert response.status_code == 400
        assert "500" in response.data["error"]

    @patch(PATCH_CREATE_AGENT)
    def test_returns_sse_content_type(self, mock_create_agent):
        mock_msg = MagicMock()
        mock_msg.content = "Hello!"
        mock_msg.tool_calls = []

        mock_agent = MagicMock()
        mock_agent.stream.return_value = _make_updates_stream([
            {"agent": {"messages": [mock_msg]}},
        ])
        mock_create_agent.return_value = mock_agent

        response = self.client.post(
            "/api/assistant/chat/",
            {"message": "Hi there", "thread_id": "test-thread"},
            format="json",
        )

        assert response.status_code == 200
        assert response["Content-Type"] == "text/event-stream"
        assert response["Cache-Control"] == "no-cache"

    @patch(PATCH_CREATE_AGENT)
    def test_streams_token_events(self, mock_create_agent):
        mock_msg = MagicMock()
        mock_msg.content = "Hello!"
        mock_msg.tool_calls = []

        mock_agent = MagicMock()
        mock_agent.stream.return_value = _make_updates_stream([
            {"agent": {"messages": [mock_msg]}},
        ])
        mock_create_agent.return_value = mock_agent

        response = self.client.post(
            "/api/assistant/chat/",
            {"message": "Hi", "thread_id": "test"},
            format="json",
        )

        content = b"".join(response.streaming_content).decode()
        assert "event: token" in content
        assert "Hello!" in content
        assert "event: done" in content

    @patch(PATCH_CREATE_AGENT)
    def test_streams_tool_events(self, mock_create_agent):
        # AI message with tool calls
        ai_msg = MagicMock()
        ai_msg.content = ""
        ai_msg.tool_calls = [{"name": "check_zip_coverage", "args": {"zip_code": "10001"}, "id": "call_1"}]

        # Tool result message
        tool_msg = MagicMock()
        tool_msg.name = "check_zip_coverage"
        tool_msg.content = json.dumps({"serviceable": True, "zone": "core"})

        # Final AI response
        final_msg = MagicMock()
        final_msg.content = "Great news, that ZIP is in our area!"
        final_msg.tool_calls = []

        mock_agent = MagicMock()
        mock_agent.stream.return_value = _make_updates_stream([
            {"agent": {"messages": [ai_msg]}},
            {"tools": {"messages": [tool_msg]}},
            {"agent": {"messages": [final_msg]}},
        ])
        mock_create_agent.return_value = mock_agent

        response = self.client.post(
            "/api/assistant/chat/",
            {"message": "Is 10001 in your area?", "thread_id": "test"},
            format="json",
        )

        content = b"".join(response.streaming_content).decode()
        assert "event: tool_call" in content
        assert "event: tool_result" in content
        assert "event: token" in content

    @patch(PATCH_CREATE_AGENT)
    def test_anonymous_user_detected(self, mock_create_agent):
        mock_msg = MagicMock()
        mock_msg.content = "Hi!"
        mock_msg.tool_calls = []

        mock_agent = MagicMock()
        mock_agent.stream.return_value = _make_updates_stream([
            {"agent": {"messages": [mock_msg]}},
        ])
        mock_create_agent.return_value = mock_agent

        self.client.post(
            "/api/assistant/chat/",
            {"message": "Hello", "thread_id": "test"},
            format="json",
        )

        mock_create_agent.assert_called_once_with(
            is_authenticated=False,
            user_id=None,
        )

    @patch(PATCH_CREATE_AGENT)
    def test_authenticated_customer_detected(self, mock_create_agent):
        from apps.customers.models import CustomerProfile

        user = User.objects.create_user(
            username="chatuser", email="chat@test.com", password="testpass123"
        )
        CustomerProfile.objects.create(user=user, phone="5551234567")

        mock_msg = MagicMock()
        mock_msg.content = "Hi!"
        mock_msg.tool_calls = []

        mock_agent = MagicMock()
        mock_agent.stream.return_value = _make_updates_stream([
            {"agent": {"messages": [mock_msg]}},
        ])
        mock_create_agent.return_value = mock_agent

        self.client.force_authenticate(user=user)
        self.client.post(
            "/api/assistant/chat/",
            {"message": "What are my bookings?", "thread_id": "test"},
            format="json",
        )

        mock_create_agent.assert_called_once_with(
            is_authenticated=True,
            user_id=user.id,
        )

    @patch(PATCH_CREATE_AGENT)
    def test_agent_error_returns_sse_error_event(self, mock_create_agent):
        mock_agent = MagicMock()
        mock_agent.stream.side_effect = Exception("LLM timeout")
        mock_create_agent.return_value = mock_agent

        response = self.client.post(
            "/api/assistant/chat/",
            {"message": "Hello", "thread_id": "test"},
            format="json",
        )

        content = b"".join(response.streaming_content).decode()
        assert "event: error" in content
        assert "(631) 595-5100" in content

    @patch(PATCH_CREATE_AGENT)
    def test_agent_creation_failure_returns_503(self, mock_create_agent):
        mock_create_agent.side_effect = Exception("Redis down")

        response = self.client.post(
            "/api/assistant/chat/",
            {"message": "Hello", "thread_id": "test"},
            format="json",
        )

        assert response.status_code == 503

    def test_thread_id_auto_generated(self):
        with patch(PATCH_CREATE_AGENT) as mock_create_agent:
            mock_msg = MagicMock()
            mock_msg.content = "Hi!"
            mock_msg.tool_calls = []

            mock_agent = MagicMock()
            mock_agent.stream.return_value = _make_updates_stream([
                {"agent": {"messages": [mock_msg]}},
            ])
            mock_create_agent.return_value = mock_agent

            response = self.client.post(
                "/api/assistant/chat/",
                {"message": "Hello"},  # No thread_id
                format="json",
            )

            content = b"".join(response.streaming_content).decode()
            assert "event: done" in content
            # Thread ID should be in the done event
            assert "thread_id" in content
