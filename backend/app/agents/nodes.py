from typing import Dict, Any, Literal
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from .state import AgentState
from .tools import log_interaction, edit_interaction, search_hcps, get_interaction_history, recommend_follow_up
from ..config import settings

# Force model to use llama-3.3-70b-versatile
MODEL_NAME = "llama-3.3-70b-versatile"


def extract_entities(state: AgentState) -> AgentState:
    """
    Extract entities from user message using LLM.
    This node analyzes the user's intent and extracts relevant information.
    """
    messages = state["messages"]
    last_message = messages[-1] if messages else ""
    
    llm = ChatGroq(model=MODEL_NAME, api_key=settings.groq_api_key)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an AI assistant for a CRM system for Healthcare Professionals. 
Extract the following information from the user's message if present:
- hcp_name: Name of the Healthcare Professional
- interaction_type: Type of interaction (visit, call, email, etc.)
- date: Date of interaction (YYYY-MM-DD format)
- topics_discussed: Topics discussed
- summary: Summary of the interaction
- attendees: Attendees (if any)
- materials_shared: Materials shared (if any)
- samples_distributed: Samples distributed (if any)
- sentiment: Sentiment (positive, neutral, negative)
- outcomes: Outcomes (if any)
- follow_up_actions: Follow-up actions (if any)
- interaction_id: ID of interaction (for editing)

Return only the extracted information as a JSON object. If a field is not found, omit it."""),
        MessagesPlaceholder(variable_name="messages"),
    ])
    
    chain = prompt | llm
    response = chain.invoke({"messages": messages})
    
    # Parse the response to extract entities
    import json
    try:
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
        extracted = json.loads(content)
    except:
        extracted = {}
    
    state["extracted_entities"] = extracted
    return state


def route_to_tool(state: AgentState) -> Literal["log_interaction", "edit_interaction", "search_hcps", "get_interaction_history", "recommend_follow_up", "generate_response"]:
    """
    Route to the appropriate tool based on extracted entities and user intent.
    """
    entities = state["extracted_entities"]
    messages = state["messages"]
    last_message = messages[-1].content.lower() if messages else ""
    
    # Determine intent based on keywords and extracted entities
    if "edit" in last_message or "update" in last_message or "modify" in last_message:
        if "interaction_id" in entities:
            return "edit_interaction"
    
    if "search" in last_message or "find" in last_message:
        return "search_hcps"
    
    if "history" in last_message or "previous" in last_message or "past" in last_message:
        return "get_interaction_history"
    
    if "follow" in last_message or "recommend" in last_message or "next" in last_message:
        return "recommend_follow_up"
    
    if "log" in last_message or "record" in last_message or "meeting" in last_message or "call" in last_message or "visit" in last_message:
        return "log_interaction"
    
    # Default to generating response if no clear tool intent
    return "generate_response"


def execute_tool(state: AgentState, tool_name: str) -> AgentState:
    """
    Execute the selected tool with the extracted entities.
    """
    entities = state["extracted_entities"]
    
    tools_map = {
        "log_interaction": log_interaction,
        "edit_interaction": edit_interaction,
        "search_hcps": search_hcps,
        "get_interaction_history": get_interaction_history,
        "recommend_follow_up": recommend_follow_up
    }
    
    tool = tools_map.get(tool_name)
    if tool:
        try:
            result = tool.invoke(entities)
            state["tool_calls"].append(tool_name)
            state["final_response"] = result
        except Exception as e:
            state["final_response"] = f"Error executing {tool_name}: {str(e)}"
    
    return state


def generate_response(state: AgentState) -> AgentState:
    """
    Generate a natural language response based on tool output.
    """
    tool_output = state.get("final_response", "")
    messages = state["messages"]
    
    llm = ChatGroq(model=MODEL_NAME, api_key=settings.groq_api_key)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a helpful AI assistant for a CRM system for Healthcare Professionals.
Generate a natural language response based on the tool output. Be concise and professional."""),
        MessagesPlaceholder(variable_name="messages"),
        ("system", f"Tool output: {tool_output}")
    ])
    
    chain = prompt | llm
    response = chain.invoke({"messages": messages})
    
    state["final_response"] = response.content
    return state
