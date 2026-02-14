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


@pytest.mark.django_db
class TestHealthCheckView(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_check_with_key(self):
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}):
            response = self.client.get("/api/assistant/health/")
        assert response.status_code == 200
        assert response.data["status"] == "ok"
        assert "api_key_configured" not in response.data

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

    @patch("apps.assistant.views.create_agent")
    def test_returns_sse_content_type(self, mock_create_agent):
        # Mock agent that returns a simple response
        mock_msg = MagicMock()
        mock_msg.type = "ai"
        mock_msg.content = "Hello!"
        mock_msg.tool_calls = []

        mock_agent = MagicMock()
        mock_agent.stream.return_value = iter([(mock_msg, {})])
        mock_create_agent.return_value = mock_agent

        response = self.client.post(
            "/api/assistant/chat/",
            {"message": "Hi there", "thread_id": "test-thread"},
            format="json",
        )

        assert response.status_code == 200
        assert response["Content-Type"] == "text/event-stream"
        assert response["Cache-Control"] == "no-cache"

    @patch("apps.assistant.views.create_agent")
    def test_streams_token_events(self, mock_create_agent):
        mock_msg = MagicMock()
        mock_msg.type = "ai"
        mock_msg.content = "Hello!"
        mock_msg.tool_calls = []

        mock_agent = MagicMock()
        mock_agent.stream.return_value = iter([(mock_msg, {})])
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

    @patch("apps.assistant.views.create_agent")
    def test_streams_tool_events(self, mock_create_agent):
        # First message: AI with tool calls
        ai_msg = MagicMock()
        ai_msg.type = "ai"
        ai_msg.content = ""
        ai_msg.tool_calls = [{"name": "check_zip_coverage", "args": {"zip_code": "10001"}, "id": "call_1"}]

        # Second message: tool result
        tool_msg = MagicMock()
        tool_msg.type = "tool"
        tool_msg.name = "check_zip_coverage"
        tool_msg.content = json.dumps({"serviceable": True, "zone": "core"})

        # Third message: AI final response
        final_msg = MagicMock()
        final_msg.type = "ai"
        final_msg.content = "Great news, that ZIP is in our area!"
        final_msg.tool_calls = []

        mock_agent = MagicMock()
        mock_agent.stream.return_value = iter([
            (ai_msg, {}),
            (tool_msg, {}),
            (final_msg, {}),
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

    @patch("apps.assistant.views.create_agent")
    def test_anonymous_user_detected(self, mock_create_agent):
        mock_msg = MagicMock()
        mock_msg.type = "ai"
        mock_msg.content = "Hi!"
        mock_msg.tool_calls = []

        mock_agent = MagicMock()
        mock_agent.stream.return_value = iter([(mock_msg, {})])
        mock_create_agent.return_value = mock_agent

        self.client.post(
            "/api/assistant/chat/",
            {"message": "Hello", "thread_id": "test"},
            format="json",
        )

        # Agent created with is_authenticated=False
        mock_create_agent.assert_called_once_with(
            is_authenticated=False,
            user_id=None,
        )

    @patch("apps.assistant.views.create_agent")
    def test_authenticated_customer_detected(self, mock_create_agent):
        from apps.customers.models import CustomerProfile

        user = User.objects.create_user(
            username="chatuser", email="chat@test.com", password="testpass123"
        )
        CustomerProfile.objects.create(user=user, phone="5551234567")

        mock_msg = MagicMock()
        mock_msg.type = "ai"
        mock_msg.content = "Hi!"
        mock_msg.tool_calls = []

        mock_agent = MagicMock()
        mock_agent.stream.return_value = iter([(mock_msg, {})])
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

    @patch("apps.assistant.views.create_agent")
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

    @patch("apps.assistant.views.create_agent")
    def test_agent_creation_failure_returns_503(self, mock_create_agent):
        mock_create_agent.side_effect = Exception("Redis down")

        response = self.client.post(
            "/api/assistant/chat/",
            {"message": "Hello", "thread_id": "test"},
            format="json",
        )

        assert response.status_code == 503

    def test_thread_id_auto_generated(self):
        with patch("apps.assistant.views.create_agent") as mock_create_agent:
            mock_msg = MagicMock()
            mock_msg.type = "ai"
            mock_msg.content = "Hi!"
            mock_msg.tool_calls = []

            mock_agent = MagicMock()
            mock_agent.stream.return_value = iter([(mock_msg, {})])
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
