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
    Extract entities from user message using regex and pattern matching.
    This is more reliable than LLM extraction for this use case.
    """
    messages = state["messages"]
    last_message = messages[-1] if messages else ""
    message_content = last_message.content if hasattr(last_message, 'content') else str(last_message)
    
    import logging
    import re
    from datetime import datetime, timedelta
    
    logger = logging.getLogger(__name__)
    logger.info(f"Extracting entities from message: {message_content[:100]}...")
    logger.info(f"Full message content: {message_content}")
    
    extracted = {}
    
    # Extract HCP name (look for "Dr." followed by name)
    hcp_patterns = [
        r'Dr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        r'Doctor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
    ]
    for pattern in hcp_patterns:
        match = re.search(pattern, message_content, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            # Stop at common stop words
            stop_words = ['today', 'at', 'in', 'on', 'from', 'to', 'with', 'and']
            for stop_word in stop_words:
                if stop_word in name.lower():
                    name = name.split(stop_word)[0].strip()
            extracted['hcp_name'] = f"Dr. {name}"
            break
    
    # Fallback: if no Dr. pattern, look for "met" followed by a name
    if 'hcp_name' not in extracted and 'met' in message_content.lower():
        match = re.search(r'met\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)', message_content, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            # Stop at common stop words
            stop_words = ['today', 'at', 'in', 'on', 'from', 'to', 'with', 'and']
            for stop_word in stop_words:
                if stop_word in name.lower():
                    name = name.split(stop_word)[0].strip()
            extracted['hcp_name'] = f"Dr. {name}"
    
    # Extract time (look for patterns like "2 PM", "2:00 PM", "14:00")
    time_patterns = [
        (r'(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)', 'with_ampm'),  # 2:00 PM
        (r'(\d{1,2}):(\d{2})', '24hour'),  # 14:00
        (r'(\d{1,2})\s*(AM|PM|am|pm)', 'hour_ampm'),  # 2 PM
    ]
    for pattern, pattern_type in time_patterns:
        match = re.search(pattern, message_content, re.IGNORECASE)
        if match:
            try:
                if pattern_type == 'with_ampm':
                    hour = int(match.group(1))
                    minute = int(match.group(2))
                    ampm = match.group(3).upper()
                    if ampm == 'PM' and hour != 12:
                        hour += 12
                    elif ampm == 'AM' and hour == 12:
                        hour = 0
                    extracted['time'] = f"{hour:02d}:{minute:02d}"
                elif pattern_type == '24hour':
                    hour = int(match.group(1))
                    minute = int(match.group(2))
                    extracted['time'] = f"{hour:02d}:{minute:02d}"
                elif pattern_type == 'hour_ampm':
                    hour = int(match.group(1))
                    ampm = match.group(2).upper()
                    if ampm == 'PM' and hour != 12:
                        hour += 12
                    elif ampm == 'AM' and hour == 12:
                        hour = 0
                    extracted['time'] = f"{hour:02d}:00"
                break
            except (IndexError, ValueError) as e:
                logger.warning(f"Failed to parse time with pattern {pattern_type}: {e}")
                continue
    
    # Extract date (look for "today" or specific dates)
    if 'today' in message_content.lower():
        extracted['date'] = datetime.now().strftime('%Y-%m-%d')
    
    # Extract topics discussed
    if 'discussed' in message_content.lower():
        # Extract text after "discussed" until sentence boundaries or pronouns
        match = re.search(r'discussed\s+(.*?)(?:\.|\.\s+He|\.?\s+He|\.?\s+She|\.?\s+They|\.?\s+Please|\.?\s+I will|$)', message_content, re.IGNORECASE)
        if match:
            topics = match.group(1).strip()
            # Clean up trailing punctuation
            topics = re.sub(r'\.?\s*$', '', topics)
            extracted['topics_discussed'] = topics
    
    # Extract materials shared
    materials = []
    if 'brochure' in message_content.lower():
        materials.append('clinical trial brochure')
    if 'pricing' in message_content.lower() or 'price' in message_content.lower():
        materials.append('pricing details')
    if materials:
        extracted['materials_shared'] = ', '.join(materials)
    
    # Extract sentiment
    if 'very interested' in message_content.lower() or 'interested' in message_content.lower():
        extracted['sentiment'] = 'positive'
    elif 'concerned' in message_content.lower() or 'worried' in message_content.lower():
        extracted['sentiment'] = 'negative'
    else:
        extracted['sentiment'] = 'neutral'
    
    # Extract follow-up actions
    if 'follow-up' in message_content.lower() or 'follow up' in message_content.lower():
        match = re.search(r'follow[- ]up\s+(.*?)(?:\.|$)', message_content, re.IGNORECASE)
        if match:
            extracted['follow_up_actions'] = match.group(1).strip()
        else:
            extracted['follow_up_actions'] = 'Schedule follow-up meeting'
    
    # Set interaction type based on context
    if 'met' in message_content.lower() or 'visit' in message_content.lower():
        extracted['interaction_type'] = 'visit'
    elif 'call' in message_content.lower():
        extracted['interaction_type'] = 'call'
    elif 'email' in message_content.lower():
        extracted['interaction_type'] = 'email'
    
    # Generate summary from topics
    if 'topics_discussed' in extracted:
        extracted['summary'] = extracted['topics_discussed']
    elif 'hcp_name' in extracted:
        extracted['summary'] = f'Meeting with {extracted["hcp_name"]}'
    
    logger.info(f"Extracted entities: {extracted}")
    
    state["extracted_entities"] = extracted
    return state


def route_to_tool(state: AgentState) -> Literal["log_interaction", "edit_interaction", "search_hcps", "get_interaction_history", "recommend_follow_up", "generate_response"]:
    """
    Route to the appropriate tool based on extracted entities and user intent.
    """
    entities = state["extracted_entities"]
    messages = state["messages"]
    last_message = messages[-1].content.lower() if messages else ""
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Routing decision - Entities: {entities}")
    logger.info(f"Routing decision - Message: {last_message[:100]}...")
    
    # Determine intent based on keywords and extracted entities
    if "edit" in last_message or "update" in last_message or "modify" in last_message:
       if "interaction_id" in entities:
            return "edit_interaction"
    
    if "search" in last_message or "find" in last_message:
        return "search_hcps"
    
    if "history" in last_message or "previous" in last_message or "past" in last_message:
        return "get_interaction_history"
    
    # Check if this is a log interaction request - prioritize this over other tools
    # Expanded keywords to catch natural language descriptions of interactions
    log_keywords = [
        "log", "record", "meeting", "call", "visit", 
        "met", "discussed", "spoke", "talked", "visited",
        "saw", "appointment", "consultation", "interaction"
    ]
    matched_keywords = [keyword for keyword in log_keywords if keyword in last_message]
    logger.info(f"Matched keywords: {matched_keywords}")
    if matched_keywords:
        logger.info(f"Routing to log_interaction due to keywords: {matched_keywords}")
        logger.info(f"Full message: {last_message}")
        return "log_interaction"
    
    # Check follow-up recommendations after log_interaction to prevent incorrect routing
    if "follow" in last_message or "recommend" in last_message or "next" in last_message:
        return "recommend_follow_up"
    
    # Also check if hcp_name is present in extracted entities - this indicates logging intent
    if "hcp_name" in entities:
        logger.info(f"Routing to log_interaction due to hcp_name in entities")
        return "log_interaction"
    
    # If ANY entity was extracted, assume it's a log interaction
    if entities and len(entities) > 0:
        logger.info(f"Routing to log_interaction due to extracted entities: {list(entities.keys())}")
        return "log_interaction"
    
    # Default to generating response if no clear tool intent
    logger.info(f"Routing to generate_response (default)")
    return "generate_response"


def execute_tool(state: AgentState, tool_name: str) -> AgentState:
    """
    Execute the selected tool with the extracted entities.
    Always use prefill_only mode for log_interaction to require user confirmation.
    """
    entities = state["extracted_entities"]
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Executing tool: {tool_name} with entities: {entities}")
    
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
                logger.info(f"Setting prefill_only=True for log_interaction")
            
            result = tool.invoke(entities)
            logger.info(f"Tool result: {result}")
            state["tool_calls"].append(tool_name)
            state["final_response"] = result
            # Store the raw tool result for parsing later
            state["tool_result"] = result
        except Exception as e:
            logger.error(f"Error executing {tool_name}: {str(e)}")
            state["final_response"] = f"Error executing {tool_name}: {str(e)}"
    
    return state


def generate_response(state: AgentState) -> AgentState:
    """
    Generate a natural language response based on tool output.
    This should only be called for non-structured responses.
    """
    tool_output = state.get("final_response", "")
    tool_result = state.get("tool_result", "")
    messages = state["messages"]

    llm = ChatGroq(model=MODEL_NAME, api_key=settings.groq_api_key)

    # If tool_result already contains structured data, return it directly
    if tool_result:
        try:
            import json
            parsed = json.loads(tool_result) if isinstance(tool_result, str) else tool_result
            if isinstance(parsed, dict) and "action" in parsed and "prefill" in parsed:
                # Return structured response directly
                state["final_response"] = parsed
                return state
        except:
            pass

    # Otherwise, generate natural language response
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
