"""
AIVOA CCMS – utils.py
Shared helper utilities: ID generation, logging config, pagination, etc.
"""
from __future__ import annotations

import logging
import random
import string
from datetime import datetime, timezone
from typing import Any


# ──────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────

def configure_logging(level: int = logging.INFO) -> None:
    """Set up a clean console logger for the application."""
    logging.basicConfig(
        level=level,
        format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


logger = logging.getLogger("aivoa.ccms")


# ──────────────────────────────────────────────
# Complaint ID generator
# ──────────────────────────────────────────────

def generate_complaint_id() -> str:
    """
    Generate a human-readable, unique complaint reference.
    Format: RESAI-<YYYYMMDD>-<6 random alphanumeric chars>
    Example: RESAI-20250610-A3KZ91
    """
    date_part   = datetime.now(tz=timezone.utc).strftime("%Y%m%d")
    random_part = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"RESAI-{date_part}-{random_part}"


# ──────────────────────────────────────────────
# Pagination helpers
# ──────────────────────────────────────────────

def paginate(query_results: list[Any], page: int, page_size: int) -> list[Any]:
    """Slice a list for the requested page (1-indexed)."""
    start = (page - 1) * page_size
    return query_results[start : start + page_size]


def clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(value, hi))


# ──────────────────────────────────────────────
# Sentiment label helper
# ──────────────────────────────────────────────

_NEGATIVE_KEYWORDS = {
    "terrible", "awful", "worst", "horrible", "hate", "disgusting",
    "unacceptable", "broken", "failed", "fraud", "scam", "angry", "furious",
    "disappointed", "useless", "never", "refund", "cheated",
}
_POSITIVE_KEYWORDS = {
    "great", "excellent", "amazing", "satisfied", "happy", "good",
    "thank", "appreciate", "resolved", "helpful", "wonderful",
}


def naive_sentiment(text: str) -> str:
    """
    Rule-based sentiment fallback (used when Groq is unavailable).
    Returns 'positive', 'neutral', or 'negative'.
    """
    tokens    = set(text.lower().split())
    neg_hits  = len(tokens & _NEGATIVE_KEYWORDS)
    pos_hits  = len(tokens & _POSITIVE_KEYWORDS)
    if neg_hits > pos_hits:
        return "negative"
    if pos_hits > neg_hits:
        return "positive"
    return "neutral"


# ──────────────────────────────────────────────
# Priority inference helper
# ──────────────────────────────────────────────

_CRITICAL_KEYWORDS = {"urgent", "critical", "emergency", "immediately", "asap"}
_HIGH_KEYWORDS      = {"broken", "failed", "fraud", "scam", "refund", "cheated"}


def infer_priority(description: str) -> str:
    tokens = set(description.lower().split())
    if tokens & _CRITICAL_KEYWORDS:
        return "critical"
    if tokens & _HIGH_KEYWORDS:
        return "high"
    return "medium"


# ──────────────────────────────────────────────
# Safe dict helper
# ──────────────────────────────────────────────

def safe_get(d: dict, *keys: str, default: Any = None) -> Any:
    """Safely traverse nested dicts without raising KeyError."""
    for key in keys:
        if not isinstance(d, dict):
            return default
        d = d.get(key, default)
    return d
