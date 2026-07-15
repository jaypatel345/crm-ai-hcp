from typing import Dict, Any, Literal
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage, SystemMessage
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from .state import AgentState
from .tools import log_interaction, edit_interaction, search_hcps, get_interaction_history, recommend_follow_up
from ..config import settings

# Force model to use llama-3.1-8b-instant (same as graph)
MODEL_NAME = "llama-3.1-8b-instant"


def extract_entities(state: AgentState) -> AgentState:
    """
    Extract entities from user message using LLM.
    This node analyzes the user's intent and extracts relevant information.
    IMPORTANT: Only extract information explicitly provided by the user. Do not guess or invent values.
    """
    messages = state["messages"]
    last_message = messages[-1] if messages else ""
    
    llm = ChatGroq(model=MODEL_NAME, api_key=settings.groq_api_key)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an AI assistant for a CRM system for Healthcare Professionals. 
Extract the following information from the user's message ONLY if explicitly provided:
- hcp_name: Name of the Healthcare Professional (look for "Dr.", "Doctor", or names)
- interaction_type: Type of interaction (visit, call, email, etc.)
- date: Date of interaction (YYYY-MM-DD format)
- time: Time of interaction (HH:MM format, e.g., "2:00 PM" should be "14:00")
- topics_discussed: Topics discussed
- summary: Summary of the interaction
- attendees: Attendees (if any)
- materials_shared: Materials shared (if any)
- samples_distributed: Samples distributed (if any)
- sentiment: Sentiment (positive, neutral, negative)
- outcomes: Outcomes (if any)
- follow_up_actions: Follow-up actions (if any)
- interaction_id: ID of interaction (for editing)

CRITICAL RULES:
- Only extract information that is EXPLICITLY mentioned in the user's message
- Do NOT guess, infer, or invent any values
- Do NOT fill in default values for missing fields
- If a field is not mentioned, omit it from the JSON entirely
- Do NOT ask for confirmation or additional details

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
    
    # Check if this is a log interaction request - prioritize this over generate_response
    if "log" in last_message or "record" in last_message or "meeting" in last_message or "call" in last_message or "visit" in last_message:
        return "log_interaction"
    
    # Also check if hcp_name is present in extracted entities - this indicates logging intent
    if "hcp_name" in entities:
        return "log_interaction"
    
    # Default to generating response if no clear tool intent
    return "generate_response"


def execute_tool(state: AgentState, tool_name: str) -> AgentState:
    """
    Execute the selected tool with the extracted entities.
    Always use prefill_only mode for log_interaction to require user confirmation.
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
            # For log_interaction, always use prefill_only mode to require user confirmation
            if tool_name == "log_interaction":
                entities["prefill_only"] = True
            
            result = tool.invoke(entities)
            state["tool_calls"].append(tool_name)
            state["final_response"] = result
            # Store the raw tool result for parsing later
            state["tool_result"] = result
        except Exception as e:
            state["final_response"] = f"Error executing {tool_name}: {str(e)}"
    
    return state


def generate_response(state: AgentState) -> AgentState:
    """
    Generate a natural language response based on tool output.
    If tool output contains structured JSON with action/prefill, preserve it.
    """
    tool_output = state.get("final_response", "")
    tool_result = state.get("tool_result", "")
    messages = state["messages"]

    llm = ChatGroq(model=MODEL_NAME, api_key=settings.groq_api_key)

    # Check if tool result contains structured JSON
    structured_data = None
    if tool_result:
        try:
            import json
            # Try to parse the tool result as JSON
            if isinstance(tool_result, str):
                parsed = json.loads(tool_result)
                if isinstance(parsed, dict) and "action" in parsed and "prefill" in parsed:
                    structured_data = parsed
        except:
            pass

    if structured_data:
        # For structured responses, generate a natural language message
        # but keep the structured data intact
        action = structured_data.get("action", "")
        prefill_data = structured_data.get("prefill", {})
        
        if action == "log_interaction" and prefill_data.get("prefill_only") == True:
            # For prefill mode, ask for confirmation
            system_content = (
                "You are a helpful AI assistant for a CRM system for Healthcare Professionals. "
                "The user has provided information to populate a Log Interaction form. "
                "Generate a brief confirmation message that says: "
                "\"I've filled in all the information you provided. Some fields may still be missing. Would you like to save this Log Interaction?\""
                "Be concise and professional. Do not include any JSON or technical details."
            )
        else:
            system_content = (
                "You are a helpful AI assistant for a CRM system for Healthcare Professionals. "
                "Generate a brief, natural language confirmation message based on the action being performed. "
                "Be concise and professional. Do not include any JSON or technical details. "
                "IMPORTANT: Do NOT ask for confirmation or additional details. The system automatically creates HCP records if they don't exist."
            )
            
            if action == "edit_interaction":
                system_content += " The user is editing an existing interaction."
            elif action == "create_hcp":
                system_content += " The user is creating a new HCP record."
        
        response = llm.invoke([SystemMessage(content=system_content), *messages])
        
        # Return structured response with natural language message
        state["final_response"] = {
            "response": response.content,
            "action": structured_data.get("action"),
            "prefill": structured_data.get("prefill")
        }
    else:
        # For non-structured responses, use the original logic
        system_content = (
            "You are a helpful AI assistant for a CRM system for Healthcare Professionals. "
            "Generate a natural language response based on the tool output when provided. "
            "Be concise and professional."
        )
        if tool_output:
            system_content += f"\n\nTool output:\n{tool_output}"

        response = llm.invoke([SystemMessage(content=system_content), *messages])
        state["final_response"] = response.content

    return state
