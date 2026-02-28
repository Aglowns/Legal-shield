from __future__ import annotations

from pydantic import BaseModel


class LegalResourceOut(BaseModel):
    id: str
    name: str
    type: str
    state: str
    city: str | None = None
    county: str | None = None
    phone: str | None = None
    website: str | None = None
    address: str | None = None
    coverage: str | None = None
    categories: list[str]
    source: str = "curated"

    model_config = {"from_attributes": True}
