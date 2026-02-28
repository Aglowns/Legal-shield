from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path

import httpx

from app.config import settings
from app.schemas.analysis import ClassifierResult, LEGAL_CATEGORIES

logger = logging.getLogger(__name__)

CLASSIFY_SYSTEM_PROMPT = """\
You are a document classifier. Determine whether the text is a legal document \
(contract, agreement, lease, court filing, legal notice, terms of service, \
employment offer, etc.) or something unrelated (spam, marketing, personal letter, \
fiction, etc.).

If it IS a legal document, also identify:
- document_type: a short label like "Lease Agreement", "Employment Contract", "NDA", etc.
- jurisdiction: the US state or country mentioned, or null if unclear.
- category: one of Housing, Employment, Family, Consumer, Immigration, General.

Return ONLY valid JSON:
{"is_legal": true, "document_type": "string", "jurisdiction": "string or null", "category": "string", "rejection_reason": null}

If NOT legal, set is_legal to false and provide a brief rejection_reason."""

CLASSIFY_USER_TEMPLATE = """\
Classify this document:

--- DOCUMENT START ---
%s
--- DOCUMENT END ---"""

# Legacy prompt for local llama-cpp model (single-prompt format)
CLASSIFY_PROMPT_LOCAL = CLASSIFY_SYSTEM_PROMPT + "\n\n" + CLASSIFY_USER_TEMPLATE + "\n\nJSON response:"

CONTEXT_WINDOW = 4000

# State names (lowercase) for heuristic extraction; order longer names first to match "new york" before "york"
US_STATE_NAMES_FOR_HEURISTIC = [
    "new hampshire", "new jersey", "new mexico", "new york", "north carolina", "north dakota",
    "rhode island", "south carolina", "south dakota", "west virginia",
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut",
    "delaware", "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa",
    "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts", "michigan",
    "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada", "ohio",
    "oklahoma", "oregon", "pennsylvania", "tennessee", "texas", "utah", "vermont",
    "virginia", "washington", "wisconsin", "wyoming",
]


def _heuristic_jurisdiction(text: str) -> str | None:
    """Try to find a US state name in the document text for location-based resources."""
    if not text or len(text) < 20:
        return None
    lower = text.lower()
    for state in US_STATE_NAMES_FOR_HEURISTIC:
        if f"state of {state}" in lower or f" {state} " in lower or f" {state}." in lower or f" {state}," in lower:
            return state.title()
    return None


class ClassifierService:
    def __init__(self) -> None:
        self._local_llm = None

    def load_model(self) -> None:
        if settings.openrouter_api_key:
            logger.info(
                "OpenRouter classifier enabled (model: %s)",
                settings.openrouter_model,
            )
            return

        model_path = settings.classifier_model_path
        if not Path(model_path).exists():
            logger.warning(
                "No OpenRouter key and no local model at %s — using keyword heuristics",
                model_path,
            )
            return

        logger.info("Loading local classifier model from %s …", model_path)
        try:
            from llama_cpp import Llama
            self._local_llm = Llama(
                model_path=model_path,
                n_ctx=4096,
                n_threads=settings.classifier_threads,
                verbose=False,
            )
            logger.info("Local classifier model loaded.")
        except ImportError:
            logger.warning(
                "llama-cpp-python not installed; using keyword heuristics only. "
                "Install it locally for a local model, or set OPENROUTER_API_KEY."
            )

    def unload_model(self) -> None:
        self._local_llm = None

    async def classify(self, text: str) -> ClassifierResult:
        snippet = text[:CONTEXT_WINDOW]

        if settings.openrouter_api_key:
            result = await self._classify_openrouter(snippet)
            if result is not None:
                return result
            logger.warning("OpenRouter classification failed; trying fallback.")

        if self._local_llm is not None:
            return await asyncio.to_thread(self._classify_local, snippet)

        return self._heuristic_classify(snippet)

    # ── OpenRouter (sourceful/riverflow-v2-fast) ──────────────────────

    async def _classify_openrouter(self, snippet: str) -> ClassifierResult | None:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{settings.openrouter_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.openrouter_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.openrouter_model,
                        "temperature": 0.1,
                        "max_tokens": 300,
                        "messages": [
                            {"role": "system", "content": CLASSIFY_SYSTEM_PROMPT},
                            {"role": "user", "content": CLASSIFY_USER_TEMPLATE % snippet},
                        ],
                    },
                )
                resp.raise_for_status()
                data = resp.json()

            raw = data["choices"][0]["message"]["content"].strip()
            return self._parse_llm_response(raw)

        except Exception as exc:
            logger.error("OpenRouter classifier error: %s", exc)
            return None

    # ── Local llama-cpp model ─────────────────────────────────────────

    def _classify_local(self, snippet: str) -> ClassifierResult:
        prompt = CLASSIFY_PROMPT_LOCAL % snippet
        output = self._local_llm(
            prompt,
            max_tokens=256,
            temperature=0.1,
            stop=["\n\n"],
        )
        raw = output["choices"][0]["text"].strip()
        return self._parse_llm_response(raw)

    # ── Shared response parser ────────────────────────────────────────

    def _parse_llm_response(self, raw: str) -> ClassifierResult:
        try:
            start = raw.index("{")
            end = raw.rindex("}") + 1
            data = json.loads(raw[start:end])
        except (ValueError, json.JSONDecodeError):
            logger.warning("Classifier returned unparseable response: %s", raw[:200])
            return ClassifierResult(
                is_legal=True,
                document_type="Unknown",
                category="General",
            )

        category = data.get("category", "General")
        if category not in LEGAL_CATEGORIES:
            category = "General"

        return ClassifierResult(
            is_legal=bool(data.get("is_legal", True)),
            document_type=str(data.get("document_type", "Unknown")),
            jurisdiction=data.get("jurisdiction"),
            category=category,
            rejection_reason=data.get("rejection_reason"),
        )

    # ── Keyword heuristic fallback ────────────────────────────────────

    @staticmethod
    def _heuristic_classify(text: str) -> ClassifierResult:
        if not text or len(text.strip()) < 50:
            return ClassifierResult(
                is_legal=False,
                document_type="Non-legal",
                rejection_reason="This document does not appear to be a legal document.",
            )

        lower = text.lower()

        legal_signals = [
            "agreement", "contract", "lease", "tenant", "landlord",
            "rental", "lessor", "lessee", "employer", "employee",
            "hereby", "whereas", "parties", "terms and conditions",
            "terms of service", "liability", "indemnif", "arbitrat",
            "jurisdiction", "governing law", "court", "plaintiff",
            "defendant", "attorney", "counsel", "statute", "regulation",
            "non-disclosure", "confidential", "termination clause",
            "warranty", "disclaimer", "binding", "obligation", "clause",
            "section", "article", "breach", "damages", "settlement",
            "dispute", "notice", "signature", "herein", "thereof",
            "notwithstanding", "insurance", "comply", "amend",
            "effective date", "expiration", "renewal", "assignment", "employment",
        ]
        score = sum(1 for kw in legal_signals if kw in lower)

        if score < 2 and not (score >= 1 and len(text) >= 800):
            return ClassifierResult(
                is_legal=False,
                document_type="Non-legal",
                rejection_reason="This document does not appear to be a legal document.",
            )

        category = "General"
        category_keywords = {
            "Housing": ["lease", "tenant", "landlord", "rent", "eviction", "property"],
            "Employment": ["employer", "employee", "salary", "wage", "termination", "hire"],
            "Family": ["custody", "divorce", "marriage", "child support", "spouse"],
            "Consumer": ["warranty", "refund", "consumer", "purchase", "product liability"],
            "Immigration": ["visa", "immigration", "citizenship", "deportation", "asylum"],
        }
        best, best_count = "General", 0
        for cat, kws in category_keywords.items():
            c = sum(1 for kw in kws if kw in lower)
            if c > best_count:
                best, best_count = cat, c
        if best_count >= 2:
            category = best

        jurisdiction = _heuristic_jurisdiction(text)
        return ClassifierResult(
            is_legal=True,
            document_type="Legal Document",
            category=category,
            jurisdiction=jurisdiction,
        )


classifier_service = ClassifierService()
