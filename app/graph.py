from __future__ import annotations

import asyncio
import json
import os
from typing import Any, TypedDict

from dotenv import load_dotenv

from langchain_core.messages import (
    AIMessage,
    HumanMessage,
    SystemMessage,
)

from langchain_groq import ChatGroq

from langgraph.graph import (
    END,
    START,
    StateGraph,
)

from app.utils import logger, naive_sentiment


load_dotenv()


# ============================================================
# ENVIRONMENT
# ============================================================

GROQ_API_KEY = os.getenv(
    "GROQ_API_KEY",
    ""
).strip()

GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "gemma2-9b-it"
).strip()


# ============================================================
# CONFIG CHECK
# ============================================================

def check_groq_config():

    if not GROQ_API_KEY:

        raise RuntimeError(
            "GROQ_API_KEY is missing. "
            "Add it to Render Environment Variables."
        )


# ============================================================
# LLM
# ============================================================

def get_llm(
    temperature: float = 0.2,
    max_tokens: int = 1500,
):

    check_groq_config()

    return ChatGroq(
        api_key=GROQ_API_KEY,
        model=GROQ_MODEL,
        temperature=temperature,
        max_tokens=max_tokens,
    )


# ============================================================
# JSON PARSER
# ============================================================

def parse_json(text: str) -> dict[str, Any]:

    if not text:

        raise ValueError(
            "AI returned an empty response."
        )

    text = text.strip()

    # Remove markdown fences
    if text.startswith("```"):

        lines = text.splitlines()

        if lines:
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        text = "\n".join(lines).strip()

    # Direct JSON
    try:

        return json.loads(text)

    except json.JSONDecodeError:

        pass

    # Search JSON object
    start = text.find("{")
    end = text.rfind("}")

    if start != -1 and end != -1:

        json_text = text[
            start:end + 1
        ]

        try:

            return json.loads(
                json_text
            )

        except json.JSONDecodeError:

            pass

    raise ValueError(
        "AI did not return valid JSON."
    )


# ============================================================
# STATE
# ============================================================

class ComplaintState(TypedDict, total=False):

    description: str

    category: str

    priority: str

    sentiment: str

    urgency_score: int

    summary: str

    root_cause: str

    suggested_action: str

    confidence: str

    error: str


# ============================================================
# CLASSIFICATION
# ============================================================

def classify_node(
    state: ComplaintState
):

    description = state.get(
        "description",
        ""
    )

    system_prompt = """
You are ResolveAI, a pharmaceutical
Quality Management System AI.

Analyze the customer complaint.

Return ONLY valid JSON:

{
  "category": "product_quality|delivery|customer_service|billing|technical|other",
  "priority": "low|medium|high|critical",
  "root_cause": "possible root cause",
  "confidence": "0.0"
}

Rules:

- Never invent facts.
- If the cause is unknown, say investigation is required.
- High/critical priority should be considered for
  patient safety, contamination, wrong product,
  wrong strength, sterility, serious harm,
  or significant regulatory risk.
- This is decision support.
- Final QA decisions require human review.
"""

    try:

        llm = get_llm(
            temperature=0.1,
            max_tokens=800,
        )

        response = llm.invoke([
            SystemMessage(
                content=system_prompt
            ),
            HumanMessage(
                content=description
            ),
        ])

        data = parse_json(
            str(response.content)
        )

        category = str(
            data.get(
                "category",
                "other"
            )
        ).lower().strip()

        priority = str(
            data.get(
                "priority",
                "medium"
            )
        ).lower().strip()

        categories = {
            "product_quality",
            "delivery",
            "customer_service",
            "billing",
            "technical",
            "other",
        }

        priorities = {
            "low",
            "medium",
            "high",
            "critical",
        }

        if category not in categories:

            category = "other"

        if priority not in priorities:

            priority = "medium"

        return {

            "category": category,

            "priority": priority,

            "root_cause": str(
                data.get(
                    "root_cause",
                    "Investigation required."
                )
            ),

            "confidence": str(
                data.get(
                    "confidence",
                    "0.5"
                )
            ),
        }

    except Exception as exc:

        logger.exception(
            "Classification failed"
        )

        return {

            "category": "other",

            "priority": "medium",

            "root_cause": (
                "AI analysis unavailable. "
                "Manual investigation required."
            ),

            "confidence": "0",

            "error": str(exc),
        }


# ============================================================
# SENTIMENT
# ============================================================

def sentiment_node(
    state: ComplaintState
):

    description = state.get(
        "description",
        ""
    )

    system_prompt = """
Analyze the complaint sentiment and urgency.

Return ONLY JSON:

{
  "sentiment": "positive|neutral|negative",
  "urgency_score": 1
}

urgency_score must be 1 to 10.

Consider:

- patient safety
- product quality
- contamination
- serious harm
- regulatory impact
- customer impact
"""

    try:

        llm = get_llm(
            temperature=0.1,
            max_tokens=400,
        )

        response = llm.invoke([
            SystemMessage(
                content=system_prompt
            ),
            HumanMessage(
                content=description
            ),
        ])

        data = parse_json(
            str(response.content)
        )

        sentiment = str(
            data.get(
                "sentiment",
                "neutral"
            )
        ).lower()

        if sentiment not in {
            "positive",
            "neutral",
            "negative",
        }:

            sentiment = naive_sentiment(
                description
            )

        try:

            urgency = int(
                data.get(
                    "urgency_score",
                    5
                )
            )

        except Exception:

            urgency = 5

        urgency = max(
            1,
            min(10, urgency)
        )

        return {

            "sentiment": sentiment,

            "urgency_score": urgency,
        }

    except Exception:

        logger.exception(
            "Sentiment analysis failed"
        )

        return {

            "sentiment": naive_sentiment(
                description
            ),

            "urgency_score": 5,
        }


# ============================================================
# SUMMARY
# ============================================================

def summary_node(
    state: ComplaintState
):

    description = state.get(
        "description",
        ""
    )

    system_prompt = """
Create a professional pharmaceutical
complaint summary.

Requirements:

- 2 to 3 sentences
- factual
- concise
- do not invent information
- mention product/problem and impact
  when information is available

Return plain text only.
"""

    try:

        llm = get_llm(
            temperature=0.2,
            max_tokens=500,
        )

        response = llm.invoke([
            SystemMessage(
                content=system_prompt
            ),
            HumanMessage(
                content=description
            ),
        ])

        return {

            "summary": str(
                response.content
            ).strip()
        }

    except Exception:

        logger.exception(
            "Summary failed"
        )

        return {

            "summary": description[:500]
        }


# ============================================================
# ROOT CAUSE + CAPA
# ============================================================

def action_node(
    state: ComplaintState
):

    context = f"""
Complaint:

{state.get("description", "")}

Category:

{state.get("category", "")}

Priority:

{state.get("priority", "")}

Possible root cause:

{state.get("root_cause", "")}
"""

    system_prompt = """
You are a pharmaceutical Quality Assurance specialist.

Recommend investigation and CAPA actions.

Return ONLY valid JSON:

{
  "root_cause": "possible root cause",
  "suggested_action": "1. action\\n2. action\\n3. action",
  "confidence": "0.0"
}

Provide 3 to 5 practical actions.

Consider:

1. Immediate containment
2. Batch investigation
3. Evidence/document review
4. Root cause investigation
5. Corrective action
6. Preventive action
7. Customer communication
8. QA escalation

Never invent facts.

Do not say that recall or regulatory reporting
is automatically required.

Final decision requires human QA review.
"""

    try:

        llm = get_llm(
            temperature=0.2,
            max_tokens=1000,
        )

        response = llm.invoke([
            SystemMessage(
                content=system_prompt
            ),
            HumanMessage(
                content=context
            ),
        ])

        data = parse_json(
            str(response.content)
        )

        return {

            "root_cause": str(
                data.get(
                    "root_cause",
                    state.get(
                        "root_cause",
                        ""
                    )
                )
            ),

            "suggested_action": str(
                data.get(
                    "suggested_action",
                    ""
                )
            ),

            "confidence": str(
                data.get(
                    "confidence",
                    state.get(
                        "confidence",
                        "0.5"
                    )
                )
            ),
        }

    except Exception:

        logger.exception(
            "CAPA generation failed"
        )

        return {

            "suggested_action": (
                "1. Review complaint details and evidence.\n"
                "2. Assess product and patient/customer risk.\n"
                "3. Investigate the suspected root cause.\n"
                "4. Determine corrective and preventive actions.\n"
                "5. Obtain QA approval before final disposition."
            )
        }


# ============================================================
# LANGGRAPH
# ============================================================

def build_pipeline():

    workflow = StateGraph(
        ComplaintState
    )

    workflow.add_node(
        "classify",
        classify_node
    )

    workflow.add_node(
        "sentiment",
        sentiment_node
    )

    workflow.add_node(
        "summary",
        summary_node
    )

    workflow.add_node(
        "action",
        action_node
    )

    workflow.add_edge(
        START,
        "classify"
    )

    workflow.add_edge(
        "classify",
        "sentiment"
    )

    workflow.add_edge(
        "sentiment",
        "summary"
    )

    workflow.add_edge(
        "summary",
        "action"
    )

    workflow.add_edge(
        "action",
        END
    )

    return workflow.compile()


pipeline = build_pipeline()


# ============================================================
# COMPLAINT ANALYSIS
# ============================================================

async def analyse_complaint(
    description: str
):

    if not description.strip():

        raise ValueError(
            "Complaint description cannot be empty."
        )

    loop = asyncio.get_running_loop()

    result = await loop.run_in_executor(
        None,
        pipeline.invoke,
        {
            "description": description.strip()
        }
    )

    return result


# ============================================================
# AI CHAT
# ============================================================

async def chat_with_assistant(
    messages: list[dict],
    complaint_context: str | None = None,
):

    if not messages:

        return (
            "Please enter a message."
        )

    system_prompt = """
You are ResolveAI AI Copilot.

You assist pharmaceutical
customer complaint and QA teams.

You can help with:

- complaint analysis
- risk assessment
- investigation
- possible root causes
- CAPA suggestions
- complaint documentation
- professional response drafting

Rules:

1. Never invent facts.
2. Never make the final QA decision.
3. Never claim a recall is mandatory.
4. Never claim regulatory reporting is mandatory.
5. Recommend human QA review for important decisions.
6. Be concise and professional.
"""

    if complaint_context:

        system_prompt += f"""

CURRENT COMPLAINT:

--------------------------------

{complaint_context}

--------------------------------
"""

    chat_messages = [
        SystemMessage(
            content=system_prompt
        )
    ]

    for message in messages:

        role = message.get(
            "role",
            "user"
        )

        content = str(
            message.get(
                "content",
                ""
            )
        ).strip()

        if not content:
            continue

        if role == "user":

            chat_messages.append(
                HumanMessage(
                    content=content
                )
            )

        elif role == "assistant":

            chat_messages.append(
                AIMessage(
                    content=content
                )
            )

    def call_llm():

        llm = get_llm(
            temperature=0.3,
            max_tokens=1200,
        )

        response = llm.invoke(
            chat_messages
        )

        return str(
            response.content
        ).strip()

    try:

        loop = asyncio.get_running_loop()

        return await loop.run_in_executor(
            None,
            call_llm
        )

    except Exception as exc:

        logger.exception(
            "AI assistant failed"
        )

        raise RuntimeError(
            f"AI service failed: {str(exc)}"
        )
