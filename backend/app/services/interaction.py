from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from ..database.models import Interaction
from ..schemas.interaction import InteractionCreate, InteractionUpdate


class InteractionService:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100, hcp_id: Optional[int] = None) -> List[Interaction]:
        query = self.db.query(Interaction)
        if hcp_id:
            query = query.filter(Interaction.hcp_id == hcp_id)
        return query.order_by(Interaction.date.desc()).offset(skip).limit(limit).all()

    def get_by_id(self, interaction_id: int) -> Optional[Interaction]:
        return self.db.query(Interaction).filter(Interaction.id == interaction_id).first()

    def get_by_hcp_id(self, hcp_id: int, skip: int = 0, limit: int = 100) -> List[Interaction]:
        return self.db.query(Interaction).filter(Interaction.hcp_id == hcp_id).order_by(Interaction.date.desc()).offset(skip).limit(limit).all()

    def create(self, interaction_data: InteractionCreate) -> Interaction:
        db_interaction = Interaction(**interaction_data.dict())
        self.db.add(db_interaction)
        self.db.commit()
        self.db.refresh(db_interaction)
        return db_interaction

    def update(self, interaction_id: int, interaction_data: InteractionUpdate) -> Optional[Interaction]:
        db_interaction = self.get_by_id(interaction_id)
        if not db_interaction:
            return None
        for field, value in interaction_data.dict(exclude_unset=True).items():
            setattr(db_interaction, field, value)
        self.db.commit()
        self.db.refresh(db_interaction)
        return db_interaction

    def delete(self, interaction_id: int) -> bool:
        db_interaction = self.get_by_id(interaction_id)
        if not db_interaction:
            return False
        self.db.delete(db_interaction)
        self.db.commit()
        return True
