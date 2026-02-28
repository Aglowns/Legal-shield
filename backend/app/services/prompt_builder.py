from __future__ import annotations

LAWYER_PERSONAS: dict[str, str] = {
    "Housing": "a tenant-rights and real estate attorney specializing in residential and commercial leases",
    "Employment": "an employment and labor law attorney specializing in workplace rights and contracts",
    "Family": "a family law attorney specializing in custody, divorce, and domestic agreements",
    "Consumer": "a consumer protection attorney specializing in warranties, purchases, and product liability",
    "Immigration": "an immigration attorney specializing in visas, asylum, and citizenship matters",
    "General": "a general practice attorney with broad civil-law expertise",
}

JURISDICTION_HINTS: dict[str, str] = {
    "Alabama": "Alabama Code and state regulations",
    "Alaska": "Alaska Statutes",
    "Arizona": "Arizona Revised Statutes",
    "Arkansas": "Arkansas Code",
    "California": "California Civil Code and state regulations",
    "Colorado": "Colorado Revised Statutes",
    "Connecticut": "Connecticut General Statutes",
    "Delaware": "Delaware Code",
    "Florida": "Florida Statutes",
    "Georgia": "Official Code of Georgia Annotated",
    "Hawaii": "Hawaii Revised Statutes",
    "Idaho": "Idaho Statutes",
    "Illinois": "Illinois Compiled Statutes",
    "Indiana": "Indiana Code",
    "Iowa": "Iowa Code",
    "Kansas": "Kansas Statutes Annotated",
    "Kentucky": "Kentucky Revised Statutes",
    "Louisiana": "Louisiana Revised Statutes and Civil Code",
    "Maine": "Maine Revised Statutes",
    "Maryland": "Annotated Code of Maryland",
    "Massachusetts": "Massachusetts General Laws",
    "Michigan": "Michigan Compiled Laws",
    "Minnesota": "Minnesota Statutes",
    "Mississippi": "Mississippi Code",
    "Missouri": "Missouri Revised Statutes",
    "Montana": "Montana Code Annotated",
    "Nebraska": "Revised Statutes of Nebraska",
    "Nevada": "Nevada Revised Statutes",
    "New Hampshire": "New Hampshire Revised Statutes Annotated",
    "New Jersey": "New Jersey Statutes Annotated",
    "New Mexico": "New Mexico Statutes Annotated",
    "New York": "New York Consolidated Laws",
    "North Carolina": "North Carolina General Statutes",
    "North Dakota": "North Dakota Century Code",
    "Ohio": "Ohio Revised Code",
    "Oklahoma": "Oklahoma Statutes",
    "Oregon": "Oregon Revised Statutes",
    "Pennsylvania": "Pennsylvania Consolidated Statutes",
    "Rhode Island": "Rhode Island General Laws",
    "South Carolina": "South Carolina Code of Laws",
    "South Dakota": "South Dakota Codified Laws",
    "Tennessee": "Tennessee Code Annotated",
    "Texas": "Texas Statutes and Codes",
    "Utah": "Utah Code",
    "Vermont": "Vermont Statutes Annotated",
    "Virginia": "Code of Virginia",
    "Washington": "Revised Code of Washington",
    "West Virginia": "West Virginia Code",
    "Wisconsin": "Wisconsin Statutes",
    "Wyoming": "Wyoming Statutes",
}

RESPONSE_FORMAT_INSTRUCTIONS = """\
You MUST return ONLY valid JSON with this exact structure (no markdown fences):
{
  "summary": "A 2-3 sentence plain-language summary of what this document is and its purpose.",
  "jurisdiction": "The US state (or 2-letter code) that governs this document, e.g. North Carolina, California, or NC, CA. Use the state named in governing law, venue, or the body of the document. Use null if unclear.",
  "good_parts": [
    {"title": "Short title", "explanation": "Why this is favorable to the user.", "clause_reference": "Section or paragraph reference, or null"}
  ],
  "mid_risk_parts": [
    {"title": "Short title", "explanation": "Why this carries moderate risk and what to watch for.", "clause_reference": "Section or paragraph reference, or null"}
  ],
  "high_risk_parts": [
    {"title": "Short title", "explanation": "Why this is dangerous and what rights the user may lose.", "clause_reference": "Section or paragraph reference, or null"}
  ]
}

Each array may be empty if there are no items for that risk level.
Be thorough — identify at least a few items for each category when they exist.
Write in plain language a non-lawyer can understand."""


def build_system_prompt(
    document_type: str,
    jurisdiction: str | None,
    category: str,
) -> str:
    persona = LAWYER_PERSONAS.get(category, LAWYER_PERSONAS["General"])

    location_block = ""
    if jurisdiction:
        statutes = JURISDICTION_HINTS.get(jurisdiction, f"{jurisdiction} state and local laws")
        location_block = (
            f"\n\nJURISDICTION: This document falls under {jurisdiction} law. "
            f"Reference applicable provisions from the {statutes} where relevant. "
            f"Flag any clauses that may conflict with {jurisdiction}-specific protections."
        )

    return (
        f"You are {persona}. "
        f"You are reviewing a {document_type} on behalf of a community member who is NOT a lawyer. "
        f"Your goal is to protect their interests by clearly identifying what is good, "
        f"what carries moderate risk, and what is high-risk or potentially harmful."
        f"{location_block}\n\n"
        f"{RESPONSE_FORMAT_INSTRUCTIONS}"
    )
