from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .typing import List

router = APIRouter()

class InteractionCreate(BaseModel):
    user_id: str
    message: str
    metadata: dict | None = None

class InteractionResponse(InteractionCreate):
    id: int

mock_store = []


@router.post("/interactions", response_model=InteractionResponse)
async def create_interaction(payload: InteractionCreate):
    item = {"id": len(mock_store) + 1, **payload.dict()}
    mock_store.append(item)
    return item


@router.get("/interactions", response_model=list[InteractionResponse])
async def list_interactions():
    return mock_store
