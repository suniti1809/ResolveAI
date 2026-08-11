"""
AIVOA CCMS – graph.py
LangGraph-powered AI pipeline for complaint analysis and assistant chat.

Pipeline nodes (StateGraph – linear chain):
  1. classify   – Determine category, priority, root cause, confidence
  2. sentiment  – Sentiment label + urgency score 1-10
  3. summary    – 2-3 sentence executive summary
  4. action     – Numbered list of recommended resolution steps

The chat_with_assistant function supports multi-turn conversation.
"""
from __future__ import annotations

import asyncio
import json
import os
from typing import Optional

from dotenv import load_dotenv
from groq import Groq
from langchain_groq import ChatGroq
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict

from app.utils import logger, naive_sentiment

load_dotenv()

_GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
_MODEL        = "llama-3.1-8b-instant"


# ──────────────────────────────────────────────
# Groq / LangChain client helpers
# ──────────────────────────────────────────────

def _get_raw_client() -> Groq:
    """Raw Groq SDK client (used for multi-turn assistant chat)."""
    if not _GROQ_API_KEY or _GROQ_API_KEY == "your_groq_api_key_here":
        raise RuntimeError(
            "GROQ_API_KEY is not set. Please update backend/.env before using AI features."
        )
    return Groq(api_key=_GROQ_API_KEY)


def _get_lc_llm() -> ChatGroq:
    """LangChain-compatible ChatGroq wrapper (used inside LangGraph nodes)."""
    if not _GROQ_API_KEY or _GROQ_API_KEY == "your_groq_api_key_here":
        raise RuntimeError(
            "GROQ_API_KEY is not set. Please update backend/.env before using AI features."
        )
    return ChatGroq(
        api_key=_GROQ_API_KEY,
        model_name=_MODEL,
        temperature=0.3,
    )


def _lc_chat(system: str, user: str, temperature: float = 0.3) -> str:
    """
    Synchronous single-shot LangChain chat via ChatGroq.
    Called from inside LangGraph nodes (which are sync).
    """
    llm  = ChatGroq(api_key=_GROQ_API_KEY, model_name=_MODEL, temperature=temperature)
    msgs = [SystemMessage(content=system), HumanMessage(content=user)]
    resp = llm.invoke(msgs)
    return resp.content.strip()


# ──────────────────────────────────────────────
# LangGraph State Schema (TypedDict)
# ──────────────────────────────────────────────

class AnalysisState(TypedDict, total=False):
    description:      str
    category:         str
    priority:         str
    sentiment:        str
    urgency_score:    int
    summary:          str
    root_cause:       str
    suggested_action: str
    confidence:       str
    error:            Optional[str]


# ──────────────────────────────────────────────
# LangGraph Nodes
# Each node receives the FULL state dict and returns
# a PARTIAL dict of keys to update (LangGraph merges them).
# ──────────────────────────────────────────────

def _node_classify(state: AnalysisState) -> dict:
    """Node 1: Classify category, priority, root cause, confidence."""
    system = (
        "You are a QMS (Quality Management System) specialist. "
        "Given a customer complaint, return ONLY a valid JSON object with these exact keys:\n"
        '  "category": one of [product_quality, delivery, customer_service, billing, technical, other]\n'
        '  "priority": one of [low, medium, high, critical]\n'
        '  "root_cause": a concise root-cause statement (max 120 chars)\n'
        '  "confidence": a float between 0 and 1\n'
        "Return nothing else — no markdown fences, no explanation."
    )
    text = state.get("description", "")
    try:
        raw  = _lc_chat(system, text, temperature=0.2)
        # Strip accidental markdown fences from LLM output
        raw  = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        data = json.loads(raw)
        return {
            "category":   data.get("category",   "other"),
            "priority":   data.get("priority",   "medium"),
            "root_cause": data.get("root_cause",  ""),
            "confidence": str(data.get("confidence", "0.8")),
        }
    except Exception as exc:
        logger.warning("classify node failed: %s", exc)
        return {
            "category":   "other",
            "priority":   "medium",
            "root_cause": "",
            "confidence": "0.5",
            "error":      str(exc),
        }


def _node_sentiment(state: AnalysisState) -> dict:
    """Node 2: Sentiment analysis + urgency score."""
    system = (
        "You are a sentiment analysis expert. "
        "Given a customer complaint, return ONLY a valid JSON object with:\n"
        '  "sentiment": one of [positive, neutral, negative]\n'
        '  "urgency_score": integer 1-10 (10 = most urgent)\n'
        "Return nothing else — no markdown fences, no explanation."
    )
    text = state.get("description", "")
    try:
        raw  = _lc_chat(system, text, temperature=0.2)
        raw  = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        data = json.loads(raw)
        return {
            "sentiment":     data.get("sentiment",     naive_sentiment(text)),
            "urgency_score": int(data.get("urgency_score", 5)),
        }
    except Exception as exc:
        logger.warning("sentiment node failed: %s", exc)
        return {
            "sentiment":     naive_sentiment(text),
            "urgency_score": 5,
        }


def _node_summary(state: AnalysisState) -> dict:
    """Node 3: Executive summary."""
    system = (
        "You are a concise business analyst. "
        "Summarise the following customer complaint in 2-3 sentences for a support manager. "
        "Focus on impact, what went wrong, and urgency. Be factual and professional."
    )
    text = state.get("description", "")
    try:
        summary = _lc_chat(system, text, temperature=0.4)
        return {"summary": summary}
    except Exception as exc:
        logger.warning("summary node failed: %s", exc)
        return {"summary": text[:200]}


def _node_action(state: AnalysisState) -> dict:
    """Node 4: Suggested resolution action."""
    system = (
        "You are a customer-experience resolution expert at ResolveAI. "
        "Given the complaint context below, provide a numbered list of 3-5 concrete action steps "
        "that the support team should take to resolve the issue. Be specific and actionable."
    )
    context = (
        f"Category: {state.get('category', '')}\n"
        f"Priority: {state.get('priority', '')}\n"
        f"Root Cause: {state.get('root_cause', '')}\n"
        f"Complaint: {state.get('description', '')}"
    )
    try:
        action = _lc_chat(system, context, temperature=0.5)
        return {"suggested_action": action}
    except Exception as exc:
        logger.warning("action node failed: %s", exc)
        return {"suggested_action": "Please review the complaint and follow standard escalation protocol."}


# ──────────────────────────────────────────────
# Build & compile the LangGraph StateGraph
# ──────────────────────────────────────────────

def _build_pipeline():
    """
    Constructs the LangGraph pipeline:
        classify_node → sentiment_node → summary_node → action_node → END
    """
    builder = StateGraph(AnalysisState)

    # Register nodes
    builder.add_node("classify_node",  _node_classify)
    builder.add_node("sentiment_node", _node_sentiment)
    builder.add_node("summary_node",   _node_summary)
    builder.add_node("action_node",    _node_action)

    # Linear edges
    builder.add_edge(START, "classify_node")
    builder.add_edge("classify_node",  "sentiment_node")
    builder.add_edge("sentiment_node", "summary_node")
    builder.add_edge("summary_node",   "action_node")
    builder.add_edge("action_node",    END)

    return builder.compile()



# Compile once at module load (fast — no LLM calls here)
_pipeline = _build_pipeline()


# ──────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────

async def analyse_complaint(description: str) -> AnalysisState:
    """
    Run the full LangGraph analysis pipeline on a complaint description.

    Runs synchronous LangGraph pipeline in a thread-pool executor so it
    doesn't block FastAPI's async event loop.

    Returns a dict with:
        category, priority, sentiment, urgency_score,
        summary, root_cause, suggested_action, confidence
    """
    initial_state: AnalysisState = {"description": description}

    loop   = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, _pipeline.invoke, initial_state)

    logger.info(
        "Analysis complete: sentiment=%s urgency=%s category=%s",
        result.get("sentiment"),
        result.get("urgency_score"),
        result.get("category"),
    )
    return result


async def chat_with_assistant(
    messages: list[dict],
    complaint_context: str | None = None,
) -> str:
    """
    Multi-turn conversational AI using LangChain's ChatGroq.

    Args:
        messages: list of {role, content} dicts (user + assistant turns)
        complaint_context: optional complaint text injected as system context
    """
    system_content = (
        "You are ResolveAI Assistant — an intelligent customer support specialist "
        "at ResolveAI's Quality Management System. You help support agents:\n"
        "  • Understand the root cause of complaints\n"
        "  • Draft professional responses to customers\n"
        "  • Suggest resolution steps and escalation paths\n"
        "  • Provide insights on quality trends\n"
        "Always be professional, empathetic, and concise. "
        "If a complaint context is provided, use it to give specific advice."
    )
    if complaint_context:
        system_content += f"\n\n--- Current Complaint ---\n{complaint_context}"

    # Build LangChain message list
    lc_messages = [SystemMessage(content=system_content)]
    for m in messages:
        role    = m.get("role", "user")
        content = m.get("content", "")
        if role == "user":
            lc_messages.append(HumanMessage(content=content))
        elif role == "assistant":
            lc_messages.append(AIMessage(content=content))

    def _call() -> str:
        llm  = ChatGroq(api_key=_GROQ_API_KEY, model_name=_MODEL, temperature=0.6, max_tokens=1024)
        resp = llm.invoke(lc_messages)
        return resp.content.strip()

    try:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _call)
    except Exception as exc:
        logger.error("chat_with_assistant failed: %s", exc)
        return (
            "I'm currently unable to reach the AI service. "
            "Please verify your GROQ_API_KEY in backend/.env and try again."
        )
