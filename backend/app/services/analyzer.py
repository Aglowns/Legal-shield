from __future__ import annotations

import json
import logging

from openai import AsyncOpenAI, AuthenticationError

from app.config import settings
from app.schemas.analysis import AnalysisResponse, DealPoint, _compute_risk_score

logger = logging.getLogger(__name__)


def _parse_deal_points(raw: list | None) -> list[DealPoint]:
    if not raw:
        return []
    points: list[DealPoint] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        points.append(
            DealPoint(
                title=str(item.get("title", "Untitled")),
                explanation=str(item.get("explanation", "")),
                clause_reference=item.get("clause_reference"),
            )
        )
    return points


def _safe_parse(raw: str, document_type: str, jurisdiction: str | None, category: str) -> AnalysisResponse | None:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("OpenAI returned non-JSON: %s", raw[:300])
        return None

    if not isinstance(data, dict) or "summary" not in data:
        return None

    good = _parse_deal_points(data.get("good_parts"))
    mid = _parse_deal_points(data.get("mid_risk_parts"))
    high = _parse_deal_points(data.get("high_risk_parts"))
    raw_jurisdiction = data.get("jurisdiction") or jurisdiction
    parsed_jurisdiction = str(raw_jurisdiction).strip() if raw_jurisdiction else None
    return AnalysisResponse(
        summary=str(data.get("summary", "")),
        document_type=document_type,
        jurisdiction=parsed_jurisdiction or jurisdiction,
        category=category,
        good_parts=good,
        mid_risk_parts=mid,
        high_risk_parts=high,
        risk_score=_compute_risk_score(len(mid), len(high)),
    )


async def analyze_document(
    markdown_text: str,
    system_prompt: str,
    document_type: str,
    jurisdiction: str | None,
    category: str,
) -> AnalysisResponse:
    if not settings.openai_api_key:
        raise ValueError(
            "OPENAI_API_KEY is not configured. "
            "Add it to backend/.env to enable document analysis."
        )

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    try:
        completion = await client.chat.completions.create(
            model=settings.openai_model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analyze this document:\n\n{markdown_text}"},
            ],
        )
    except AuthenticationError:
        raise ValueError(
            "OpenAI API key is invalid. Check OPENAI_API_KEY in backend/.env."
        )

    raw = completion.choices[0].message.content or ""
    result = _safe_parse(raw, document_type, jurisdiction, category)

    if result is None:
        logger.error("Failed to parse LLM analysis — returning minimal response")
        return AnalysisResponse(
            summary="Analysis could not be completed. Please try again.",
            document_type=document_type,
            jurisdiction=jurisdiction,
            category=category,
            good_parts=[],
            mid_risk_parts=[],
            high_risk_parts=[],
            risk_score=100,
        )

    return result
