from __future__ import annotations

import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.db.resources import find_resources
from app.schemas.analysis import AnalysisResponse
from app.services.classifier import classifier_service
from app.services.converter import convert_file, UnsupportedFileError
from app.services.prompt_builder import build_system_prompt
from app.services.analyzer import analyze_document

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(
    file: UploadFile | None = File(None),
    text: str | None = Form(None),
) -> AnalysisResponse:
    # --- 1. Extract text (conversion runs in a background thread) ---
    if text and text.strip():
        markdown = text.strip()[:12_000]
    elif file:
        try:
            content = await file.read()
            markdown = await convert_file(content, file.filename or "upload.txt")
        except UnsupportedFileError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
    else:
        raise HTTPException(status_code=400, detail="Provide a file upload or paste document text.")

    if not markdown:
        raise HTTPException(status_code=400, detail="No readable content found in the document.")

    # --- 2. Classify with small LLM (runs in a background thread) ---
    classification = await classifier_service.classify(markdown)

    if not classification.is_legal:
        raise HTTPException(
            status_code=422,
            detail=classification.rejection_reason
            or "This document does not appear to be a legal document we can analyze.",
        )

    # --- 3. Build dynamic system prompt ---
    system_prompt = build_system_prompt(
        document_type=classification.document_type,
        jurisdiction=classification.jurisdiction,
        category=classification.category,
    )

    # --- 4. Analyze with OpenAI ---
    try:
        analysis = await analyze_document(
            markdown_text=markdown,
            system_prompt=system_prompt,
            document_type=classification.document_type,
            jurisdiction=classification.jurisdiction,
            category=classification.category,
        )
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    # --- 5. Document state for Local Impact Connector (analyzer or classifier) ---
    state_abbrev = _jurisdiction_to_state_abbrev(analysis.jurisdiction or classification.jurisdiction)
    analysis.state = state_abbrev
    analysis.resources = find_resources(
        state=state_abbrev,
        category=classification.category,
    )

    return analysis


_STATE_ABBREVS: dict[str, str] = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
    "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE",
    "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
    "new mexico": "NM", "new york": "NY", "north carolina": "NC",
    "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR",
    "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA",
    "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
}


def _jurisdiction_to_state_abbrev(jurisdiction: str | None) -> str | None:
    if not jurisdiction:
        return None
    j = jurisdiction.strip().upper()
    if len(j) == 2 and j.isalpha():
        return j
    return _STATE_ABBREVS.get(jurisdiction.strip().lower())
