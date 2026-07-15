from typing import Any
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
from .nodes import extract_entities, route_to_tool, execute_tool, generate_response
from ..config import settings

# Force model to use llama-3.3-70b-versatile
MODEL_NAME = "llama-3.1-8b-instant"


def agent_node(state: AgentState) -> AgentState:
    """
    Process a user message, route to the proper tool when needed, and generate a response.
    """
    import logging
    import json
    logger = logging.getLogger(__name__)
    
    state = extract_entities(state)
    tool_name = route_to_tool(state)
    
    logger.info(f"Agent node routing to: {tool_name}")
    logger.info(f"Tool name type: {type(tool_name)}")

    # For log_interaction, ALWAYS return structured response - never call generate_response
    if tool_name == "log_interaction":
        logger.info("Entering log_interaction branch")
        # Execute the tool
        state = execute_tool(state, tool_name)
        
        tool_result = state.get("tool_result", "")
        logger.info(f"Log interaction tool result: {tool_result[:500] if tool_result else 'empty'}")
        
        # Try to parse as JSON and return structured response
        try:
            parsed = json.loads(tool_result) if isinstance(tool_result, str) else tool_result
            if isinstance(parsed, dict):
                # Return structured response with action and prefill
                prefill_data = parsed.get("prefill", {})
                # Ensure prefill_only is set for frontend confirmation flow
                prefill_data["prefill_only"] = True
                
                state["final_response"] = {
                    "response": "I've filled in the form with the information you provided. Would you like to save this interaction?",
                    "action": parsed.get("action", "log_interaction"),
                    "prefill": prefill_data
                }
                logger.info(f"Returning structured response for log_interaction")
                return state
        except Exception as e:
            logger.error(f"Failed to parse tool result: {e}")
        
        # Fallback: create structured response from extracted entities
        entities = state.get("extracted_entities", {})
        entities["prefill_only"] = True
        
        state["final_response"] = {
            "response": "I've filled in the form with the information you provided. Would you like to save this interaction?",
            "action": "log_interaction",
            "prefill": entities
        }
        logger.info(f"Returning fallback structured response")
        return state
    
    if tool_name == "generate_response":
        logger.info("Entering generate_response branch")
        return generate_response(state)

    # For other tools, execute and use generate_response
    logger.info(f"Executing other tool: {tool_name}")
    state = execute_tool(state, tool_name)
    return generate_response(state)


def create_graph():
    """
    Create the LangGraph for the CRM AI agent.
    """
    # Initialize the graph with our state
    workflow = StateGraph(AgentState)

    # Add only the custom agent node (no built-in tool calling)
    workflow.add_node("agent", agent_node)

    # Set the entry point
    workflow.set_entry_point("agent")

    # The agent node handles all routing internally, so we go straight to END
    workflow.add_edge("agent", END)

    # Compile the graph
    app = workflow.compile()

    return app


class AgentGraph:
    def __init__(self):
        self.graph = create_graph()
        self.logger = logging.getLogger(__name__)

    def run(self, message: str) -> str | dict:
        """
        Run the agent with a user message.

        Args:
            message: User's input message

        Returns:
            Agent's response (string or dict with structured data)
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
            # Example failed_generation: '<function=log_interaction>{"hcp_name":"Dr..."}...'
            msg = str(e)
            self.logger.error("Groq BadRequestError during graph.invoke: %s", msg)

            m = re.search(r"<function=(?P<fn>[\w_]+)>", msg)
            if m:
                fn_name = m.group("fn")
                # Find first '{' after function tag and extract one balanced JSON object.
                start_idx = msg.find("{", m.end())
                if start_idx == -1:
                    self.logger.error(
                        "No JSON payload found in failed_generation: %s", msg
                    )
                    raise

                def _extract_balanced(s: str, start: int) -> str | None:
                    depth = 0
                    in_str = False
                    esc = False
                    i = start
                    while i < len(s):
                        ch = s[i]
                        if in_str:
                            if esc:
                                esc = False
                            elif ch == "\\":
                                esc = True
                            elif ch == '"':
                                in_str = False
                        else:
                            if ch == '"':
                                in_str = True
                            elif ch == "{":
                                depth += 1
                            elif ch == "}":
                                depth -= 1
                                if depth == 0:
                                    return s[start : i + 1]
                        i += 1
                    return None

                payload_text = _extract_balanced(msg, start_idx)
                if not payload_text:
                    self.logger.error(
                        "Could not extract balanced JSON payload from failed_generation: %s",
                        msg,
                    )
                    raise

                try:
                    payload = json.loads(payload_text)
                except Exception as ex:
                    self.logger.error(
                        "Failed to parse payload JSON from failed_generation: %s", ex
                    )
                    raise

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
                        tool_result = tool_fn(**payload)
                        # Try to parse as structured response
                        try:
                            parsed = json.loads(tool_result)
                            if isinstance(parsed, dict) and "action" in parsed:
                                # Generate a natural language response for the structured data
                                llm = ChatGroq(model=MODEL_NAME, api_key=settings.groq_api_key)
                                from langchain_core.messages import SystemMessage
                                system_content = (
                                    "You are a helpful AI assistant for a CRM system for Healthcare Professionals. "
                                    "Generate a brief, natural language confirmation message based on the action being performed. "
                                    "Be concise and professional. "
                                    "IMPORTANT: Do NOT ask for confirmation or additional details. The system automatically creates HCP records if they don't exist."
                                )
                                action = parsed.get("action", "")
                                prefill_data = parsed.get("prefill", {})
                                if action == "log_interaction":
                                    if prefill_data.get("prefill_only") == True:
                                        system_content += " The user is providing information to populate a form. Confirm the form has been populated and ask if they need to add more details or are ready to save."
                                    else:
                                        system_content += " The user is logging an interaction with an HCP."
                                elif action == "edit_interaction":
                                    system_content += " The user is editing an existing interaction."
                                
                                response = llm.invoke([SystemMessage(content=system_content), HumanMessage(content=message)])
                                return {
                                    "response": response.content,
                                    "action": parsed.get("action"),
                                    "prefill": parsed.get("prefill")
                                }
                        except:
                            pass
                        return tool_result
                    except Exception as ex:
                        self.logger.error(
                            "Fallback tool call %s failed: %s", fn_name, ex
                        )
                        raise

            # If fallback unsuccessful, re-raise original error for upstream handling
            raise

        # Get the final response
        final_response = result.get("final_response")
        if final_response:
            return final_response

        messages = result.get("messages", [])
        if messages:
            last_message = messages[-1]
            if isinstance(last_message, AIMessage):
                return last_message.content
            elif isinstance(last_message, ToolMessage):
                return last_message.content

        return "No response generated"
