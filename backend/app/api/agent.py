from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging
import traceback

from ..agents.graph import AgentGraph
import groq
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


@router.post("/ai/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with the LangGraph AI agent.
    This endpoint processes user messages through the LangGraph agent
    and returns the agent's response.
    """
    # Quick pre-check for required config
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=500,
            detail=(
                "GROQ API key is not configured. Set GROQ_API_KEY in backend/.env "
                "or environment and restart the server."
            ),
        )

    try:
        agent = AgentGraph()
        response = agent.run(request.message)
        return ChatResponse(response=response)
    except groq.BadRequestError as e:
        # Handle provider-side bad request (e.g., function call failure) and surface details
        logger.error("Groq BadRequest in /ai/chat: %s", traceback.format_exc())
        err_text = str(e)
        # Try to extract the failed_generation payload if present
        failed_gen = None
        try:
            if "failed_generation" in err_text:
                # crude extraction: take substring after 'failed_generation':
                idx = err_text.find("failed_generation")
                failed_gen = err_text[idx:]
        except Exception:
            failed_gen = None
        detail_msg = f"LLM function-call failed: {failed_gen or err_text}"
        raise HTTPException(status_code=500, detail=detail_msg)
    except Exception as e:
        # Log full traceback for server-side debugging and return concise message
        logger.error("Error in /ai/chat: %s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


@router.post("/ai/voice-summary", response_model=ChatResponse)
async def voice_summary(request: ChatRequest):
    """
    Summarize a voice note using the LLM.
    This endpoint takes a voice note transcript and generates a summary.
    """
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=500,
            detail=(
                "GROQ API key is not configured. Set GROQ_API_KEY in backend/.env "
                "or environment and restart the server."
            ),
        )

    try:
        from langchain_groq import ChatGroq

        llm = ChatGroq(model=settings.model, api_key=settings.groq_api_key)

        prompt = f"""Summarize the following voice note transcript for a CRM interaction with a Healthcare Professional:

{request.message}

Provide a concise summary including:
- Main topics discussed
- Key outcomes
- Any follow-up actions needed
"""

        response = llm.invoke(prompt)
        return ChatResponse(response=response.content)
    except Exception as e:
        logger.error("Error in /ai/voice-summary: %s", traceback.format_exc())
        raise HTTPException(
            status_code=500, detail=f"Error generating summary: {str(e)}"
        )


@router.post("/ai/follow-up", response_model=ChatResponse)
async def follow_up_suggestions(request: ChatRequest):
    """
    Generate follow-up suggestions based on interaction context.
    This endpoint analyzes interaction data and suggests follow-up actions.
    """
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=500,
            detail=(
                "GROQ API key is not configured. Set GROQ_API_KEY in backend/.env "
                "or environment and restart the server."
            ),
        )

    try:
        from langchain_groq import ChatGroq

        llm = ChatGroq(model=settings.model, api_key=settings.groq_api_key)

        prompt = f"""Based on the following interaction information, suggest appropriate follow-up actions:

{request.message}

Provide specific recommendations for:
- When to follow up
- What to discuss
- Any materials to prepare
"""

        response = llm.invoke(prompt)
        return ChatResponse(response=response.content)
    except Exception as e:
        logger.error("Error in /ai/follow-up: %s", traceback.format_exc())
        raise HTTPException(
            status_code=500, detail=f"Error generating follow-up suggestions: {str(e)}"
        )
