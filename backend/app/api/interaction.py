from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database.db import get_db
from ..schemas.interaction import InteractionCreate, InteractionUpdate, InteractionResponse
from ..services.interaction import InteractionService

router = APIRouter()


@router.get("/interactions", response_model=List[InteractionResponse])
async def get_interactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    hcp_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    service = InteractionService(db)
    return service.get_all(skip=skip, limit=limit, hcp_id=hcp_id)


@router.get("/interactions/{interaction_id}", response_model=InteractionResponse)
async def get_interaction(interaction_id: int, db: Session = Depends(get_db)):
    service = InteractionService(db)
    interaction = service.get_by_id(interaction_id)
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return interaction


@router.get("/hcps/{hcp_id}/interactions", response_model=List[InteractionResponse])
async def get_hcp_interactions(
    hcp_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    service = InteractionService(db)
    return service.get_by_hcp_id(hcp_id, skip=skip, limit=limit)


@router.post("/interactions", response_model=InteractionResponse, status_code=201)
async def create_interaction(interaction_data: InteractionCreate, db: Session = Depends(get_db)):
    service = InteractionService(db)
    return service.create(interaction_data)


@router.put("/interactions/{interaction_id}", response_model=InteractionResponse)
async def update_interaction(interaction_id: int, interaction_data: InteractionUpdate, db: Session = Depends(get_db)):
    service = InteractionService(db)
    updated_interaction = service.update(interaction_id, interaction_data)
    if not updated_interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return updated_interaction


@router.delete("/interactions/{interaction_id}", status_code=204)
async def delete_interaction(interaction_id: int, db: Session = Depends(get_db)):
    service = InteractionService(db)
    if not service.delete(interaction_id):
        raise HTTPException(status_code=404, detail="Interaction not found")
