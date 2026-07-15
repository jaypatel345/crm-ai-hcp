from typing import TypedDict, List, Optional, Dict, Any
from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    messages: List[BaseMessage]
    current_hcp: Optional[Dict[str, Any]]
    interaction_data: Optional[Dict[str, Any]]
    tool_calls: List[str]
    extracted_entities: Dict[str, Any]
    final_response: str
