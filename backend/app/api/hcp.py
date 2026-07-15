from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database.db import get_db
from ..schemas.hcp import HCPCreate, HCPUpdate, HCPResponse
from ..services.hcp import HCPService

router = APIRouter()


@router.get("/hcps", response_model=List[HCPResponse])
async def get_hcps(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    service = HCPService(db)
    return service.get_all(skip=skip, limit=limit, search=search)


@router.get("/hcps/{hcp_id}", response_model=HCPResponse)
async def get_hcp(hcp_id: int, db: Session = Depends(get_db)):
    service = HCPService(db)
    hcp = service.get_by_id(hcp_id)
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    return hcp


@router.post("/hcps", response_model=HCPResponse, status_code=201)
async def create_hcp(hcp_data: HCPCreate, db: Session = Depends(get_db)):
    service = HCPService(db)
    return service.create(hcp_data)


@router.put("/hcps/{hcp_id}", response_model=HCPResponse)
async def update_hcp(hcp_id: int, hcp_data: HCPUpdate, db: Session = Depends(get_db)):
    service = HCPService(db)
    updated_hcp = service.update(hcp_id, hcp_data)
    if not updated_hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    return updated_hcp


@router.delete("/hcps/{hcp_id}", status_code=204)
async def delete_hcp(hcp_id: int, db: Session = Depends(get_db)):
    service = HCPService(db)
    if not service.delete(hcp_id):
        raise HTTPException(status_code=404, detail="HCP not found")
