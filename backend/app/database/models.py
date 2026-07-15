from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class HCP(Base):
    __tablename__ = "hcps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    specialty = Column(String, index=True)
    hospital = Column(String)
    city = Column(String)
    phone = Column(String)
    email = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    interactions = relationship("Interaction", back_populates="hcp", cascade="all, delete-orphan")


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcp_id = Column(Integer, ForeignKey("hcps.id"), nullable=False, index=True)
    interaction_type = Column(String, nullable=False)  # visit, call, email, etc.
    date = Column(DateTime(timezone=True), nullable=False)
    time = Column(String)  # Optional time string
    attendees = Column(Text)  # Comma-separated list
    topics_discussed = Column(Text)  # Comma-separated or JSON
    voice_note_summary = Column(Text)
    materials_shared = Column(Text)  # Comma-separated list
    samples_distributed = Column(Text)  # Comma-separated list
    sentiment = Column(String)  # positive, neutral, negative
    outcomes = Column(Text)
    follow_up_actions = Column(Text)
    ai_suggested_followups = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    hcp = relationship("HCP", back_populates="interactions")
