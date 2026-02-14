"""
SSE streaming views for the ToteTaxi assistant.
"""
import json
import logging
import uuid

from django.http import StreamingHttpResponse
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .graph import create_agent

logger = logging.getLogger(__name__)

MAX_MESSAGE_LENGTH = 500


def sse_event(event_type: str, data: dict) -> str:
    """Format a Server-Sent Event."""
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


class ChatView(APIView):
    """
    SSE streaming chat endpoint.

    POST /api/assistant/chat/
    Body: { "message": "...", "thread_id": "..." }
    Response: SSE stream with event types: token, tool_call, tool_result, done, error
    """

    permission_classes = [permissions.AllowAny]

    MAX_HISTORY_MESSAGES = 30

    @method_decorator(ratelimit(key="ip", rate="20/h", method="POST", block=True))
    def post(self, request):
        message = (request.data.get("message") or "").strip()
        thread_id = request.data.get("thread_id") or str(uuid.uuid4())
        history = request.data.get("history") or []

        # Validate message
        if not message:
            return Response(
                {"error": "Message is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(message) > MAX_MESSAGE_LENGTH:
            return Response(
                {"error": f"Message must be {MAX_MESSAGE_LENGTH} characters or fewer"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Detect authentication — customer only (not staff)
        is_authenticated = (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "customer_profile")
        )
        user_id = request.user.id if is_authenticated else None

        # Create the agent
        try:
            agent = create_agent(
                is_authenticated=is_authenticated,
                user_id=user_id,
            )
        except Exception as e:
            logger.error(f"Failed to create agent: {e}")
            return Response(
                {"error": "Chat service temporarily unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        def event_stream():
            """Generator that yields SSE events."""
            try:
                config = {
                    "configurable": {"thread_id": thread_id},
                    "recursion_limit": 10,
                }

                # Rebuild conversation from history + new message
                messages_list = []
                for msg in history[-self.MAX_HISTORY_MESSAGES:]:
                    role = msg.get("role", "")
                    content = msg.get("content", "")
                    if role in ("user", "assistant") and content:
                        messages_list.append((role, content))
                messages_list.append(("user", message))

                input_messages = {
                    "messages": messages_list,
                }

                full_response = ""

                for event in agent.stream(
                    input_messages, config=config, stream_mode="messages"
                ):
                    msg, metadata = event
                    msg_type = getattr(msg, "type", "unknown")

                    # Stream AI tokens (AIMessage or AIMessageChunk)
                    if msg_type in ("ai", "AIMessageChunk"):
                        tool_calls = getattr(msg, "tool_calls", None)
                        if tool_calls:
                            for tc in tool_calls:
                                tool_name = tc.get("name", "") if isinstance(tc, dict) else getattr(tc, "name", "")
                                if tool_name:  # Skip partial/empty streaming chunks
                                    yield sse_event(
                                        "tool_call",
                                        {
                                            "tool": tool_name,
                                        },
                                    )
                        elif msg.content:
                            # Content can be a string or a list of content blocks
                            content = msg.content
                            if isinstance(content, list):
                                text_parts = [
                                    block.get("text", "") if isinstance(block, dict) else str(block)
                                    for block in content
                                ]
                                content = "".join(text_parts)
                            if content:
                                full_response += content
                                yield sse_event("token", {"content": content})

                    # Tool results
                    elif msg_type == "tool":
                        try:
                            result = (
                                json.loads(msg.content)
                                if isinstance(msg.content, str)
                                else msg.content
                            )
                        except (json.JSONDecodeError, TypeError):
                            result = {"raw": str(msg.content)}

                        yield sse_event(
                            "tool_result",
                            {
                                "tool": msg.name,
                                "result": result,
                            },
                        )

                    else:
                        logger.debug(
                            f"Unhandled message type: {msg_type}, "
                            f"class: {type(msg).__name__}, "
                            f"content: {getattr(msg, 'content', '')[:100]}"
                        )

                yield sse_event(
                    "done",
                    {
                        "thread_id": thread_id,
                    },
                )

            except Exception as e:
                logger.error(f"Agent stream error: {e}", exc_info=True)
                yield sse_event(
                    "error",
                    {
                        "message": (
                            "I encountered an issue. Please try again "
                            "or contact us at (631) 595-5100."
                        )
                    },
                )

        response = StreamingHttpResponse(
            event_stream(),
            content_type="text/event-stream",
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


class HealthCheckView(APIView):
    """Simple health check for the assistant service."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        import os

        has_api_key = bool(os.environ.get("ANTHROPIC_API_KEY"))

        return Response(
            {
                "status": "ok" if has_api_key else "degraded",
                "api_key_configured": has_api_key,
            }
        )
