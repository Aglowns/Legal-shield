from __future__ import annotations

from pydantic import BaseModel

from app.schemas.resources import LegalResourceOut

LEGAL_CATEGORIES = frozenset(
    ["Housing", "Employment", "Family", "Consumer", "Immigration", "General"]
)


class DealPoint(BaseModel):
    title: str
    explanation: str
    clause_reference: str | None = None


class ClassifierResult(BaseModel):
    is_legal: bool
    document_type: str
    jurisdiction: str | None = None
    category: str = "General"
    rejection_reason: str | None = None


def _compute_risk_score(mid_count: int, high_count: int) -> int:
    """100 minus 5 per mid-risk part, 10 per high-risk part; clamped to 0–100."""
    return max(0, 100 - (mid_count * 5) - (high_count * 10))


class AnalysisResponse(BaseModel):
    summary: str
    document_type: str
    jurisdiction: str | None = None
    state: str | None = None  # 2-letter state code from document (for resource filtering)
    category: str
    good_parts: list[DealPoint]
    mid_risk_parts: list[DealPoint]
    high_risk_parts: list[DealPoint]
    risk_score: int = 100  # 0–100: 100 − 5×mid − 10×high
    resources: list[LegalResourceOut] = []
    disclaimer: str = (
        "Legal Shield provides educational insights and is not legal advice. "
        "Consult a licensed attorney for decisions affecting your rights."
    )
