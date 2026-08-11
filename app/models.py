"""
AIVOA CCMS – models.py
SQLAlchemy ORM models for complaints and AI analysis results.
"""
from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ──────────────────────────────────────────────
# Enumerations
# ──────────────────────────────────────────────

class ComplaintStatus(str, enum.Enum):
    OPEN        = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED    = "resolved"
    CLOSED      = "closed"


class Priority(str, enum.Enum):
    LOW      = "low"
    MEDIUM   = "medium"
    HIGH     = "high"
    CRITICAL = "critical"


class Category(str, enum.Enum):
    PRODUCT_QUALITY  = "product_quality"
    DELIVERY         = "delivery"
    CUSTOMER_SERVICE = "customer_service"
    BILLING          = "billing"
    TECHNICAL        = "technical"
    OTHER            = "other"


# ──────────────────────────────────────────────
# Complaint table
# ──────────────────────────────────────────────

class Complaint(Base):
    __tablename__ = "complaints"

    id              = Column(Integer, primary_key=True, index=True, autoincrement=True)
    complaint_id    = Column(String(20),  unique=True, index=True, nullable=False)
    customer_name   = Column(String(120), nullable=False)
    customer_email  = Column(String(200), nullable=False)
    customer_phone  = Column(String(30),  nullable=True)
    origin_site     = Column(String(200), nullable=True)
    product_name    = Column(String(200), nullable=True)
    batch_number    = Column(String(100), nullable=True)
    category        = Column(Enum(Category), default=Category.OTHER, nullable=False)
    priority        = Column(Enum(Priority), default=Priority.MEDIUM, nullable=False)
    status          = Column(Enum(ComplaintStatus), default=ComplaintStatus.OPEN, nullable=False)
    description     = Column(Text, nullable=False)
    resolution_note = Column(Text, nullable=True)
    detection_date  = Column(Date, nullable=True)

    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at  = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # One complaint → one AI analysis (optional)
    analysis = relationship("AIAnalysis", back_populates="complaint", uselist=False, cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Complaint id={self.id} complaint_id={self.complaint_id!r} status={self.status}>"


# ──────────────────────────────────────────────
# AI Analysis table
# ──────────────────────────────────────────────

class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id           = Column(Integer, primary_key=True, index=True, autoincrement=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), unique=True, nullable=False)

    sentiment        = Column(String(30),  nullable=True)   # e.g. positive / neutral / negative
    urgency_score    = Column(Integer,     nullable=True)   # 1-10
    summary          = Column(Text,        nullable=True)
    root_cause       = Column(Text,        nullable=True)
    suggested_action = Column(Text,        nullable=True)
    ai_category      = Column(String(100), nullable=True)   # LLM-inferred category
    confidence       = Column(String(10),  nullable=True)   # e.g. "0.92"

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    complaint = relationship("Complaint", back_populates="analysis")

    def __repr__(self) -> str:
        return f"<AIAnalysis complaint_id={self.complaint_id} sentiment={self.sentiment!r}>"
