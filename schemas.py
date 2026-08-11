"""
AIVOA CCMS – schemas.py
Pydantic v2 request / response models.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models import Category, ComplaintStatus, Priority


# ──────────────────────────────────────────────
# AI Analysis schemas
# ──────────────────────────────────────────────

class AIAnalysisBase(BaseModel):
    sentiment:        Optional[str]  = None
    urgency_score:    Optional[int]  = Field(None, ge=1, le=10)
    summary:          Optional[str]  = None
    root_cause:       Optional[str]  = None
    suggested_action: Optional[str]  = None
    ai_category:      Optional[str]  = None
    confidence:       Optional[str]  = None


class AIAnalysisRead(AIAnalysisBase):
    id:         int
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
# Complaint schemas
# ──────────────────────────────────────────────

class ComplaintCreate(BaseModel):
    customer_name:  str            = Field(..., min_length=2, max_length=120)
    customer_email: EmailStr
    customer_phone: Optional[str]  = Field(None, max_length=30)
    origin_site:    Optional[str]  = Field(None, max_length=200)
    product_name:   Optional[str]  = Field(None, max_length=200)
    batch_number:   Optional[str]  = Field(None, max_length=100)
    category:       Category       = Category.OTHER
    priority:       Priority       = Priority.MEDIUM
    description:    str            = Field(..., min_length=10)
    detection_date: Optional[date] = None

    model_config = {"use_enum_values": True}


class ComplaintUpdate(BaseModel):
    status:          Optional[ComplaintStatus] = None
    priority:        Optional[Priority]        = None
    category:        Optional[Category]        = None
    resolution_note: Optional[str]             = None

    model_config = {"use_enum_values": True}


class ComplaintRead(BaseModel):
    id:              int
    complaint_id:    str
    customer_name:   str
    customer_email:  str
    customer_phone:  Optional[str]
    origin_site:     Optional[str]
    product_name:    Optional[str]
    batch_number:    Optional[str]
    category:        str
    priority:        str
    status:          str
    description:     str
    resolution_note: Optional[str]
    detection_date:  Optional[date]
    created_at:      datetime
    updated_at:      datetime
    analysis:        Optional[AIAnalysisRead] = None

    model_config = {"from_attributes": True}


class ComplaintListResponse(BaseModel):
    total:      int
    page:       int
    page_size:  int
    complaints: list[ComplaintRead]


# ──────────────────────────────────────────────
# AI Chat schemas
# ──────────────────────────────────────────────

class ChatMessage(BaseModel):
    role:    str  = Field(..., pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    messages:     list[ChatMessage]
    complaint_id: Optional[int] = None   # attach conversation to a specific complaint


class ChatResponse(BaseModel):
    reply:        str
    complaint_id: Optional[int] = None


# ──────────────────────────────────────────────
# Generic responses
# ──────────────────────────────────────────────

class SuccessResponse(BaseModel):
    message: str
    data:    Optional[dict] = None


class ErrorResponse(BaseModel):
    detail: str
