from __future__ import annotations

from fastapi import APIRouter, Query

from app.db.resources import find_resources

router = APIRouter()


@router.get("/resources")
async def list_resources(
    state: str = Query("NC", description="Two-letter state code"),
    category: str = Query("General", description="Legal category filter"),
) -> dict:
    state = state.strip().upper()
    resources = find_resources(state=state, category=category)

    return {
        "resources": resources,
        "meta": {"state": state, "category": category, "count": len(resources)},
    }
