from typing import Annotated, Literal
import re
import json
import logging
import groq
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_groq import ChatGroq
from langchain_core.tools import tool

from .state import AgentState
from .tools import (
    log_interaction,
    edit_interaction,
    search_hcps,
    get_interaction_history,
    recommend_follow_up,
)
from ..config import settings

# Force model to use llama-3.3-70b-versatile
MODEL_NAME = "llama-3.1-8b-instant"


def create_graph():
    """
    Create the LangGraph for the CRM AI agent.
    """
    # Initialize the graph with our state
    workflow = StateGraph(AgentState)

    # Create LLM with tools
    tools = [
        log_interaction,
        edit_interaction,
        search_hcps,
        get_interaction_history,
        recommend_follow_up,
    ]
    llm = ChatGroq(model=MODEL_NAME, api_key=settings.groq_api_key).bind_tools(tools)

    # Define the agent node
    def agent_node(state: AgentState):
        messages = state["messages"]
        response = llm.invoke(messages)
        return {"messages": [response]}

    # Create tool node
    tool_node = ToolNode(tools)

    # Add nodes
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", tool_node)

    # Set the entry point
    workflow.set_entry_point("agent")

    # Define routing logic
    def should_continue(state: AgentState) -> Literal["tools", END]:
        messages = state["messages"]
        last_message = messages[-1]
        if last_message.tool_calls:
            return "tools"
        return END

    # Add conditional edges
    workflow.add_conditional_edges("agent", should_continue)
    workflow.add_edge("tools", "agent")

    # Compile the graph
    app = workflow.compile()

    return app


class AgentGraph:
    def __init__(self):
        self.graph = create_graph()
        self.logger = logging.getLogger(__name__)

    def run(self, message: str) -> str:
        """
        Run the agent with a user message.

        Args:
            message: User's input message

        Returns:
            Agent's response
        """
        # Initialize state
        initial_state = {
            "messages": [HumanMessage(content=message)],
            "current_hcp": None,
            "interaction_data": None,
            "tool_calls": [],
            "extracted_entities": {},
            "final_response": "",
        }

        # Run the graph, but if the LLM fails to call a function (provider-side),
        # attempt a safe fallback: extract the function name and payload from the
        # provider's `failed_generation` string and call the corresponding tool
        # directly. This avoids returning a 500 to the client when the LLM
        # produced a valid function payload but the provider couldn't execute it.
        try:
            result = self.graph.invoke(initial_state)
        except groq.BadRequestError as e:
            # Example failed_generation snippet in the exception message:
            # '<function=log_interaction>{"hcp_name": "Dr..."}'
            msg = str(e)
            self.logger.error("Groq BadRequestError during graph.invoke: %s", msg)

            m = re.search(r"<function=(?P<fn>[\w_]+)>(?P<payload>\{.*\})", msg)
            if m:
                fn_name = m.group("fn")
                payload_text = m.group("payload")
                try:
                    payload = json.loads(payload_text)
                except Exception as ex:
                    self.logger.error(
                        "Failed to parse payload JSON from failed_generation: %s", ex
                    )
                    raise

                # Map available tool functions
                tools_map = {
                    "log_interaction": log_interaction,
                    "edit_interaction": edit_interaction,
                    "search_hcps": search_hcps,
                    "get_interaction_history": get_interaction_history,
                    "recommend_follow_up": recommend_follow_up,
                }

                tool_fn = tools_map.get(fn_name)
                if tool_fn:
                    try:
                        # Call the tool directly and return its string result
                        tool_result = tool_fn(**payload)
                        # Wrap as a tool-like response
                        return tool_result
                    except Exception as ex:
                        self.logger.error(
                            "Fallback tool call %s failed: %s", fn_name, ex
                        )
                        raise
            # If we couldn't handle it, re-raise to be handled upstream
            raise

        # Get the final response
        messages = result.get("messages", [])
        if messages:
            last_message = messages[-1]
            if isinstance(last_message, AIMessage):
                return last_message.content
            elif isinstance(last_message, ToolMessage):
                return last_message.content

        return "No response generated"
