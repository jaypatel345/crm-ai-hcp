from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database.models import HCP
from ..schemas.hcp import HCPCreate, HCPUpdate


class HCPService:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100, search: Optional[str] = None) -> List[HCP]:
        query = self.db.query(HCP)
        if search:
            query = query.filter(
                or_(
                    HCP.name.ilike(f"%{search}%"),
                    HCP.specialty.ilike(f"%{search}%"),
                    HCP.hospital.ilike(f"%{search}%"),
                    HCP.city.ilike(f"%{search}%")
                )
            )
        return query.offset(skip).limit(limit).all()

    def get_by_id(self, hcp_id: int) -> Optional[HCP]:
        return self.db.query(HCP).filter(HCP.id == hcp_id).first()

    def create(self, hcp_data: HCPCreate) -> HCP:
        db_hcp = HCP(**hcp_data.dict())
        self.db.add(db_hcp)
        self.db.commit()
        self.db.refresh(db_hcp)
        return db_hcp

    def update(self, hcp_id: int, hcp_data: HCPUpdate) -> Optional[HCP]:
        db_hcp = self.get_by_id(hcp_id)
        if not db_hcp:
            return None
        for field, value in hcp_data.dict(exclude_unset=True).items():
            setattr(db_hcp, field, value)
        self.db.commit()
        self.db.refresh(db_hcp)
        return db_hcp

    def delete(self, hcp_id: int) -> bool:
        db_hcp = self.get_by_id(hcp_id)
        if not db_hcp:
            return False
        self.db.delete(db_hcp)
        self.db.commit()
        return True
