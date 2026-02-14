"""
LangGraph agent for ToteTaxi assistant.
Uses a ReAct-style agent with tool calling.
"""
import json
import logging
from typing import Annotated, Sequence, TypedDict

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import BaseMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages

from .prompts import SYSTEM_PROMPT
from .tools import (
    build_booking_handoff,
    check_availability,
    check_zip_coverage,
    get_pricing_estimate,
    lookup_booking_history,
    lookup_booking_status,
)

logger = logging.getLogger(__name__)

# All available tools
ALL_TOOLS = [
    check_zip_coverage,
    get_pricing_estimate,
    check_availability,
    lookup_booking_status,
    lookup_booking_history,
    build_booking_handoff,
]

# Tools that don't require authentication
PUBLIC_TOOLS = [
    check_zip_coverage,
    get_pricing_estimate,
    check_availability,
    build_booking_handoff,
]


class AgentState(TypedDict):
    """State schema for the LangGraph agent."""

    messages: Annotated[Sequence[BaseMessage], add_messages]


def create_agent(is_authenticated: bool = False, user_id: int = None):
    """
    Create a LangGraph agent with appropriate tools based on auth status.

    Args:
        is_authenticated: Whether the user is logged in
        user_id: The authenticated user's ID (for booking lookup tools)

    Returns:
        Compiled LangGraph graph ready for streaming
    """
    tools = ALL_TOOLS if is_authenticated else PUBLIC_TOOLS
    tools_by_name = {t.name: t for t in tools}

    llm = ChatAnthropic(
        model="claude-sonnet-4-20250514",
        temperature=0.3,
        max_tokens=1024,
    )
    llm_with_tools = llm.bind_tools(tools)

    # Build system message with auth + date context
    from datetime import date

    today = date.today()
    date_context = f"\n\nToday's date is {today.strftime('%A, %B %d, %Y')} ({today.isoformat()})."

    if is_authenticated and user_id:
        auth_context = (
            f"\n\nThe user is LOGGED IN (user_id: {user_id}). "
            f"You may look up their bookings using the lookup tools. "
            f"Always pass user_id={user_id} to booking lookup tools."
        )
    else:
        auth_context = (
            "\n\nThe user is NOT logged in. Do NOT attempt to look up bookings. "
            "If they ask about their bookings, suggest they log in first or "
            "contact (631) 595-5100."
        )

    system_message = SystemMessage(content=SYSTEM_PROMPT + date_context + auth_context)

    def agent_node(state: AgentState, config: RunnableConfig):
        """The main agent node that calls the LLM."""
        messages = [system_message] + list(state["messages"])
        response = llm_with_tools.invoke(messages, config)
        return {"messages": [response]}

    def tool_node(state: AgentState):
        """Execute tool calls from the last AI message."""
        outputs = []
        last_message = state["messages"][-1]
        for tool_call in last_message.tool_calls:
            tool_name = tool_call["name"]
            if tool_name in tools_by_name:
                try:
                    args = tool_call["args"].copy()
                    # Hard-bind user_id for booking lookup tools (C1 fix)
                    # Prevents IDOR via LLM-controlled arguments
                    if tool_name in ("lookup_booking_status", "lookup_booking_history"):
                        args["user_id"] = user_id
                    result = tools_by_name[tool_name].invoke(args)
                    content = json.dumps(result) if isinstance(result, dict) else str(result)
                except Exception as e:
                    logger.error(f"Tool {tool_name} failed: {e}")
                    content = json.dumps({"error": "Tool temporarily unavailable."})
            else:
                content = json.dumps({"error": f"Unknown tool: {tool_name}"})

            outputs.append(
                ToolMessage(
                    content=content,
                    name=tool_name,
                    tool_call_id=tool_call["id"],
                )
            )
        return {"messages": outputs}

    def should_continue(state: AgentState):
        """Determine whether to continue to tools or end."""
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"
        return END

    # Build the graph
    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)

    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
    graph.add_edge("tools", "agent")

    # V1: ephemeral conversations — no checkpointer needed.
    # Redis persistence can be enabled later if multi-turn memory is desired.
    return graph.compile()
