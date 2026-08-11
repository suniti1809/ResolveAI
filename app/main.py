"""
AIVOA CCMS – main.py
FastAPI application: CORS, lifespan, routers for complaints & AI assistant.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db, init_db
from app.graph import analyse_complaint, chat_with_assistant
from app.models import AIAnalysis, Complaint, ComplaintStatus, Priority
from app.schemas import (
    ChatRequest,
    ChatResponse,
    ComplaintCreate,
    ComplaintListResponse,
    ComplaintRead,
    ComplaintUpdate,
    SuccessResponse,
)
from app.utils import configure_logging, generate_complaint_id, logger

load_dotenv()

# ──────────────────────────────────────────────
# App lifespan
# ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    logger.info("ResolveAI starting up …")
    await init_db()
    logger.info("Database initialised.")
    yield
    logger.info("ResolveAI shutting down.")


# ──────────────────────────────────────────────
# FastAPI instance
# ──────────────────────────────────────────────

app = FastAPI(
    title="ResolveAI Customer Complaint Management System",
    version="1.0.0",
    description=(
        "AI-powered complaint management platform built on FastAPI + LangGraph + Groq. "
        "Automatically classifies, prioritises, and suggests resolutions for customer complaints."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "ResolveAI", "version": "1.0.0"}


# ══════════════════════════════════════════════
# Complaint endpoints
# ══════════════════════════════════════════════

@app.post(
    "/api/complaints",
    response_model=ComplaintRead,
    status_code=status.HTTP_201_CREATED,
    tags=["Complaints"],
    summary="Log a new complaint and trigger AI analysis",
)
async def create_complaint(payload: ComplaintCreate, db: AsyncSession = Depends(get_db)):
    complaint = Complaint(
        complaint_id   = generate_complaint_id(),
        customer_name  = payload.customer_name,
        customer_email = payload.customer_email,
        customer_phone = payload.customer_phone,
        origin_site    = payload.origin_site,
        product_name   = payload.product_name,
        batch_number   = payload.batch_number,
        category       = payload.category,
        priority       = payload.priority,
        description    = payload.description,
        detection_date = payload.detection_date,
    )
    db.add(complaint)
    await db.flush()   # get the auto-generated PK

    # ── Async AI analysis ──────────────────────
    try:
        analysis_data = await analyse_complaint(payload.description)
        analysis = AIAnalysis(
            complaint_id     = complaint.id,
            sentiment        = analysis_data.get("sentiment"),
            urgency_score    = analysis_data.get("urgency_score"),
            summary          = analysis_data.get("summary"),
            root_cause       = analysis_data.get("root_cause"),
            suggested_action = analysis_data.get("suggested_action"),
            ai_category      = analysis_data.get("category"),
            confidence       = analysis_data.get("confidence"),
        )
        # Override priority if AI says it's higher
        ai_priority = str(analysis_data.get("priority", "medium")).lower()
        _priority_rank = {"low": 0, "medium": 1, "high": 2, "critical": 3}
        curr_priority = complaint.priority.value if hasattr(complaint.priority, "value") else str(complaint.priority).lower()
        if _priority_rank.get(ai_priority, 0) > _priority_rank.get(curr_priority, 0):
            complaint.priority = Priority(ai_priority) if ai_priority in [p.value for p in Priority] else complaint.priority
        db.add(analysis)
        await db.flush()
    except Exception as exc:
        logger.warning("AI analysis skipped: %s", exc)

    row = (
        await db.execute(
            select(Complaint)
            .where(Complaint.id == complaint.id)
            .options(selectinload(Complaint.analysis))
        )
    ).scalar_one()
    return row


@app.get(
    "/api/complaints",
    response_model=ComplaintListResponse,
    tags=["Complaints"],
    summary="List complaints with optional filters",
)
async def list_complaints(
    page:      int = Query(1,  ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status:    str | None = Query(None),
    priority:  str | None = Query(None),
    category:  str | None = Query(None),
    search:    str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Complaint).options(selectinload(Complaint.analysis))

    # Clean count query without subquery warning
    count_q = select(func.count(Complaint.id))
    if status:
        count_q = count_q.where(Complaint.status == status)
    if priority:
        count_q = count_q.where(Complaint.priority == priority)
    if category:
        count_q = count_q.where(Complaint.category == category)
    if search:
        like = f"%{search}%"
        count_q = count_q.where(
            Complaint.customer_name.ilike(like) |
            Complaint.customer_email.ilike(like) |
            Complaint.description.ilike(like)   |
            Complaint.complaint_id.ilike(like)
        )
    total = (await db.execute(count_q)).scalar_one()

    q = q.order_by(Complaint.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()

    return ComplaintListResponse(total=total, page=page, page_size=page_size, complaints=list(rows))


@app.get(
    "/api/complaints/{complaint_id}",
    response_model=ComplaintRead,
    tags=["Complaints"],
    summary="Get a single complaint by integer ID",
)
async def get_complaint(complaint_id: int, db: AsyncSession = Depends(get_db)):
    row = (
        await db.execute(
            select(Complaint)
            .where(Complaint.id == complaint_id)
            .options(selectinload(Complaint.analysis))
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail=f"Complaint {complaint_id} not found")
    return row


@app.patch(
    "/api/complaints/{complaint_id}",
    response_model=ComplaintRead,
    tags=["Complaints"],
    summary="Update complaint status / priority / resolution note",
)
async def update_complaint(complaint_id: int, payload: ComplaintUpdate, db: AsyncSession = Depends(get_db)):
    row = (
        await db.execute(
            select(Complaint)
            .where(Complaint.id == complaint_id)
            .options(selectinload(Complaint.analysis))
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail=f"Complaint {complaint_id} not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(row, field, value)
    await db.flush()
    updated_row = (
        await db.execute(
            select(Complaint)
            .where(Complaint.id == complaint_id)
            .options(selectinload(Complaint.analysis))
        )
    ).scalar_one()
    return updated_row


@app.delete(
    "/api/complaints/{complaint_id}",
    response_model=SuccessResponse,
    tags=["Complaints"],
    summary="Delete a complaint",
)
async def delete_complaint(complaint_id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Complaint).where(Complaint.id == complaint_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail=f"Complaint {complaint_id} not found")
    await db.delete(row)
    return SuccessResponse(message=f"Complaint {complaint_id} deleted successfully.")


# ══════════════════════════════════════════════
# AI Assistant endpoint
# ══════════════════════════════════════════════

@app.post(
    "/api/assistant/chat",
    response_model=ChatResponse,
    tags=["AI Assistant"],
    summary="Chat with the ResolveAI assistant",
)
async def assistant_chat(payload: ChatRequest, db: AsyncSession = Depends(get_db)):
    context = None
    if payload.complaint_id:
        row = (await db.execute(select(Complaint).where(Complaint.id == payload.complaint_id))).scalar_one_or_none()
        if row:
            context = f"Complaint ID: {row.complaint_id}\n{row.description}"

    messages = [m.model_dump() for m in payload.messages]
    reply    = await chat_with_assistant(messages, complaint_context=context)
    return ChatResponse(reply=reply, complaint_id=payload.complaint_id)


# ══════════════════════════════════════════════
# Stats endpoint
# ══════════════════════════════════════════════

@app.get("/api/stats", tags=["Stats"], summary="Dashboard statistics")
async def get_stats(db: AsyncSession = Depends(get_db)):
    total    = (await db.execute(select(func.count(Complaint.id)))).scalar_one()
    open_c   = (await db.execute(select(func.count(Complaint.id)).where(Complaint.status == ComplaintStatus.OPEN))).scalar_one()
    resolved = (await db.execute(select(func.count(Complaint.id)).where(Complaint.status == ComplaintStatus.RESOLVED))).scalar_one()
    critical = (await db.execute(select(func.count(Complaint.id)).where(Complaint.priority == Priority.CRITICAL))).scalar_one()
    return {
        "total_complaints": total,
        "open":             open_c,
        "resolved":         resolved,
        "critical":         critical,
        "in_progress":      total - open_c - resolved,
    }


# ──────────────────────────────────────────────
# Entry-point for `python -m app.main`
# ──────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )
