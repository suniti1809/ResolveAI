from __future__ import annotations

import os

from contextlib import asynccontextmanager

from dotenv import load_dotenv

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Query,
    status,
)

from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import (
    get_db,
    init_db,
)

from app.graph import (
    analyse_complaint,
    chat_with_assistant,
)

from app.models import (
    AIAnalysis,
    Complaint,
    ComplaintStatus,
    Priority,
)

from app.schemas import (
    ChatRequest,
    ChatResponse,
    ComplaintCreate,
    ComplaintListResponse,
    ComplaintRead,
    ComplaintUpdate,
    SuccessResponse,
)

from app.utils import (
    configure_logging,
    generate_complaint_id,
    logger,
)


load_dotenv()


# ============================================================
# LIFESPAN
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    configure_logging()

    logger.info(
        "ResolveAI backend starting..."
    )

    try:

        await init_db()

        logger.info(
            "Database initialized."
        )

    except Exception:

        logger.exception(
            "Database initialization failed."
        )

    yield

    logger.info(
        "ResolveAI backend stopped."
    )


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="ResolveAI",
    description=(
        "AI-powered pharmaceutical "
        "customer complaint management system."
    ),
    version="2.0.0",
    lifespan=lifespan,
)


# ============================================================
# CORS
# ============================================================

frontend_url = os.getenv(
    "FRONTEND_URL",
    "https://resolveai-ccms.vercel.app"
).rstrip("/")


allowed_origins = [

    frontend_url,

    "https://resolveai-ccms.vercel.app",

]


# Remove duplicate origins
allowed_origins = list(
    dict.fromkeys(
        allowed_origins
    )
)


app.add_middleware(
    CORSMiddleware,

    allow_origins=allowed_origins,

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
async def root():

    return {

        "status": "active",

        "message":
            "ResolveAI Backend is running.",

        "ai_model":
            os.getenv(
                "GROQ_MODEL",
                "gemma2-9b-it"
            ),
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
async def health():

    return {

        "status": "ok",

        "service": "ResolveAI",

        "ai_model":
            os.getenv(
                "GROQ_MODEL",
                "gemma2-9b-it"
            ),
    }


# ============================================================
# CREATE COMPLAINT
# ============================================================

@app.post(
    "/api/complaints",
    response_model=ComplaintRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_complaint(
    payload: ComplaintCreate,
    db: AsyncSession = Depends(get_db),
):

    complaint = Complaint(

        complaint_id=
            generate_complaint_id(),

        customer_name=
            payload.customer_name,

        customer_email=
            payload.customer_email,

        customer_phone=
            payload.customer_phone,

        origin_site=
            payload.origin_site,

        product_name=
            payload.product_name,

        batch_number=
            payload.batch_number,

        category=
            payload.category,

        priority=
            payload.priority,

        description=
            payload.description,

        detection_date=
            payload.detection_date,
    )

    db.add(complaint)

    await db.flush()


    # --------------------------------------------------------
    # AI ANALYSIS
    # --------------------------------------------------------

    try:

        result = await analyse_complaint(
            payload.description
        )


        analysis = AIAnalysis(

            complaint_id=
                complaint.id,

            sentiment=
                result.get(
                    "sentiment"
                ),

            urgency_score=
                result.get(
                    "urgency_score"
                ),

            summary=
                result.get(
                    "summary"
                ),

            root_cause=
                result.get(
                    "root_cause"
                ),

            suggested_action=
                result.get(
                    "suggested_action"
                ),

            ai_category=
                result.get(
                    "category"
                ),

            confidence=
                result.get(
                    "confidence"
                ),
        )


        db.add(analysis)

        await db.flush()


        # AI priority
        ai_priority = str(
            result.get(
                "priority",
                "medium"
            )
        ).lower()


        if ai_priority in {
            "low",
            "medium",
            "high",
            "critical",
        }:

            try:

                current_priority = (
                    complaint.priority.value
                    if hasattr(
                        complaint.priority,
                        "value"
                    )
                    else str(
                        complaint.priority
                    ).lower()
                )

                rank = {

                    "low": 1,

                    "medium": 2,

                    "high": 3,

                    "critical": 4,
                }


                if rank.get(
                    ai_priority,
                    2
                ) > rank.get(
                    current_priority,
                    2
                ):

                    complaint.priority = (
                        Priority(ai_priority)
                    )

            except Exception:

                pass


        await db.commit()


    except Exception as exc:

        logger.exception(
            "AI analysis failed"
        )


        # Save complaint even if AI fails
        analysis = AIAnalysis(

            complaint_id=
                complaint.id,

            sentiment=None,

            urgency_score=None,

            summary=
                "AI analysis unavailable.",

            root_cause=None,

            suggested_action=
                "Manual QA review required.",

            ai_category=None,

            confidence="0",
        )


        db.add(analysis)

        await db.commit()


    # --------------------------------------------------------
    # RETURN
    # --------------------------------------------------------

    result = await db.execute(

        select(Complaint)

        .where(
            Complaint.id ==
            complaint.id
        )

        .options(
            selectinload(
                Complaint.analysis
            )
        )
    )

    return result.scalar_one()


# ============================================================
# GET COMPLAINTS
# ============================================================

@app.get(
    "/api/complaints",
    response_model=ComplaintListResponse,
)
async def get_complaints(

    page: int = Query(
        1,
        ge=1
    ),

    page_size: int = Query(
        10,
        ge=1,
        le=100
    ),

    db: AsyncSession = Depends(get_db),
):

    count_result = await db.execute(

        select(
            func.count(
                Complaint.id
            )
        )
    )

    total = count_result.scalar_one()


    result = await db.execute(

        select(Complaint)

        .options(
            selectinload(
                Complaint.analysis
            )
        )

        .order_by(
            Complaint.created_at.desc()
        )

        .offset(
            (page - 1) *
            page_size
        )

        .limit(page_size)
    )


    complaints = result.scalars().all()


    return ComplaintListResponse(

        total=total,

        page=page,

        page_size=page_size,

        complaints=list(
            complaints
        ),
    )


# ============================================================
# GET ONE COMPLAINT
# ============================================================

@app.get(
    "/api/complaints/{complaint_id}",
    response_model=ComplaintRead,
)
async def get_complaint(

    complaint_id: int,

    db: AsyncSession =
        Depends(get_db),
):

    result = await db.execute(

        select(Complaint)

        .where(
            Complaint.id ==
            complaint_id
        )

        .options(
            selectinload(
                Complaint.analysis
            )
        )
    )


    complaint = (
        result.scalar_one_or_none()
    )


    if not complaint:

        raise HTTPException(

            status_code=404,

            detail=
                "Complaint not found.",
        )


    return complaint


# ============================================================
# UPDATE
# ============================================================

@app.patch(
    "/api/complaints/{complaint_id}",
    response_model=ComplaintRead,
)
async def update_complaint(

    complaint_id: int,

    payload: ComplaintUpdate,

    db: AsyncSession =
        Depends(get_db),
):

    result = await db.execute(

        select(Complaint)

        .where(
            Complaint.id ==
            complaint_id
        )

        .options(
            selectinload(
                Complaint.analysis
            )
        )
    )


    complaint = (
        result.scalar_one_or_none()
    )


    if not complaint:

        raise HTTPException(

            status_code=404,

            detail=
                "Complaint not found.",
        )


    updates = payload.model_dump(
        exclude_none=True
    )


    for field, value in updates.items():

        setattr(
            complaint,
            field,
            value
        )


    await db.commit()


    result = await db.execute(

        select(Complaint)

        .where(
            Complaint.id ==
            complaint_id
        )

        .options(
            selectinload(
                Complaint.analysis
            )
        )
    )


    return result.scalar_one()


# ============================================================
# AI ASSISTANT
# ============================================================

@app.post(
    "/api/assistant/chat",
    response_model=ChatResponse,
)
async def assistant_chat(

    payload: ChatRequest,

    db: AsyncSession =
        Depends(get_db),
):

    complaint_context = None


    # --------------------------------------------------------
    # Complaint context
    # --------------------------------------------------------

    if payload.complaint_id:

        result = await db.execute(

            select(Complaint)

            .where(
                Complaint.id ==
                payload.complaint_id
            )
        )


        complaint = (
            result.scalar_one_or_none()
        )


        if complaint:

            complaint_context = f"""

Complaint ID:
{complaint.complaint_id}

Customer:
{complaint.customer_name}

Product:
{complaint.product_name}

Batch:
{complaint.batch_number}

Category:
{complaint.category}

Priority:
{complaint.priority}

Description:
{complaint.description}

"""


    messages = [

        message.model_dump()

        for message
        in payload.messages

    ]


    try:

        reply = await chat_with_assistant(

            messages,

            complaint_context
        )


        return ChatResponse(

            reply=reply,

            complaint_id=
                payload.complaint_id,
        )


    except Exception as exc:

        logger.exception(
            "AI assistant failed"
        )


        raise HTTPException(

            status_code=503,

            detail=str(exc)
        )


# ============================================================
# STATS
# ============================================================

@app.get(
    "/api/stats"
)
async def statistics(

    db: AsyncSession =
        Depends(get_db)
):

    total = (
        await db.execute(
            select(
                func.count(
                    Complaint.id
                )
            )
        )
    ).scalar_one()


    return {

        "total_complaints":
            total
    }


# ============================================================
# LOCAL RUN
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(

        "app.main:app",

        host="0.0.0.0",

        port=int(
            os.getenv(
                "PORT",
                "8000"
            )
        ),

        reload=True,
    )
