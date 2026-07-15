from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class HCPBase(BaseModel):
    name: str
    specialty: Optional[str] = None
    hospital: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class HCPCreate(HCPBase):
    pass


class HCPUpdate(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    hospital: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class HCPResponse(HCPBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
