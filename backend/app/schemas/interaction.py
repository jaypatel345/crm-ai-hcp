from pydantic import BaseModel


class InteractionBase(BaseModel):
    user_id: str
    message: str
    metadata: dict | None = None


class InteractionCreate(InteractionBase):
    pass


class InteractionResponse(InteractionBase):
    id: int

    class Config:
        orm_mode = True
