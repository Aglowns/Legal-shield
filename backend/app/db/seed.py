"""
Seed the legal_resources table with curated data.

Run directly:  python -m app.db.seed
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select

from app.db.database import engine, async_session, Base
from app.db.models import LegalResource

logger = logging.getLogger(__name__)

SEED_DATA: list[dict] = [
    {
        "id": "lanc-raleigh",
        "name": "Legal Aid of North Carolina - Raleigh Office",
        "type": "clinic",
        "state": "NC",
        "city": "Raleigh",
        "phone": "866-219-5262",
        "website": "https://legalaidnc.org/",
        "coverage": "Statewide intake and local office support",
        "categories": ["Housing", "Employment", "Family", "Consumer", "General"],
        "source": "curated",
    },
    {
        "id": "lanc-charlotte",
        "name": "Legal Aid of North Carolina - Charlotte Office",
        "type": "clinic",
        "state": "NC",
        "city": "Charlotte",
        "phone": "866-219-5262",
        "website": "https://legalaidnc.org/offices/",
        "coverage": "Mecklenburg and nearby counties",
        "categories": ["Housing", "Employment", "Family", "Consumer", "General"],
        "source": "curated",
    },
    {
        "id": "pisgah-legal",
        "name": "Pisgah Legal Services",
        "type": "clinic",
        "state": "NC",
        "city": "Asheville",
        "phone": "828-253-0406",
        "website": "https://www.pisgahlegal.org/",
        "coverage": "Western North Carolina",
        "categories": ["Housing", "Family", "Consumer", "General"],
        "source": "curated",
    },
    {
        "id": "ncbar-referral",
        "name": "North Carolina Bar Association - Lawyer Referral Service",
        "type": "lawyer-referral",
        "state": "NC",
        "city": "Raleigh",
        "phone": "800-662-7660",
        "website": "https://www.ncbar.org/public-resources/find-an-nc-lawyer/",
        "coverage": "North Carolina statewide referral",
        "categories": ["Housing", "Employment", "Family", "Consumer", "Immigration", "General"],
        "source": "curated",
    },
    {
        "id": "lawhelpnc",
        "name": "LawHelpNC Legal Help Directory",
        "type": "lawyer-referral",
        "state": "NC",
        "website": "https://www.lawhelpnc.org/find-legal-help/directory",
        "coverage": "North Carolina county and topic directory",
        "categories": ["Housing", "Employment", "Family", "Consumer", "Immigration", "General"],
        "source": "curated",
    },
    {
        "id": "lsc-national",
        "name": "Legal Services Corporation - National Legal Aid Finder",
        "type": "lawyer-referral",
        "state": "US",
        "website": "https://www.lsc.gov/about-lsc/what-legal-aid/i-need-legal-help",
        "coverage": "US nationwide address-based lookup",
        "categories": ["Housing", "Employment", "Family", "Consumer", "Immigration", "General"],
        "source": "curated",
    },
    {
        "id": "ga-legal-aid",
        "name": "Atlanta Legal Aid Society",
        "type": "clinic",
        "state": "GA",
        "city": "Atlanta",
        "phone": "404-524-5811",
        "website": "https://atlantalegalaid.org/",
        "coverage": "Metro Atlanta (Clayton, Cobb, DeKalb, Fulton, Gwinnett)",
        "categories": ["Housing", "Employment", "Family", "Consumer", "General"],
        "source": "curated",
    },
    {
        "id": "ga-bar-referral",
        "name": "State Bar of Georgia - Lawyer Referral Service",
        "type": "lawyer-referral",
        "state": "GA",
        "phone": "404-527-8700",
        "website": "https://www.gabar.org/forthepublic/lawyerreferralservice.cfm",
        "coverage": "Georgia statewide referral",
        "categories": ["Housing", "Employment", "Family", "Consumer", "Immigration", "General"],
        "source": "curated",
    },
    {
        "id": "ny-legal-aid",
        "name": "Legal Aid Society of New York",
        "type": "clinic",
        "state": "NY",
        "city": "New York",
        "phone": "212-577-3300",
        "website": "https://legalaidnyc.org/",
        "coverage": "New York City five boroughs",
        "categories": ["Housing", "Employment", "Family", "Consumer", "Immigration", "General"],
        "source": "curated",
    },
    {
        "id": "ca-legal-aid",
        "name": "Legal Aid Foundation of Los Angeles",
        "type": "clinic",
        "state": "CA",
        "city": "Los Angeles",
        "phone": "800-399-4529",
        "website": "https://lafla.org/",
        "coverage": "Los Angeles County",
        "categories": ["Housing", "Employment", "Family", "Consumer", "Immigration", "General"],
        "source": "curated",
    },
    {
        "id": "tx-legal-aid",
        "name": "Texas RioGrande Legal Aid",
        "type": "clinic",
        "state": "TX",
        "city": "Austin",
        "phone": "888-988-9996",
        "website": "https://www.trla.org/",
        "coverage": "South and Central Texas",
        "categories": ["Housing", "Employment", "Family", "Consumer", "Immigration", "General"],
        "source": "curated",
    },
    {
        "id": "il-legal-aid",
        "name": "Legal Aid Chicago",
        "type": "clinic",
        "state": "IL",
        "city": "Chicago",
        "phone": "312-341-1070",
        "website": "https://www.legalaidchicago.org/",
        "coverage": "Cook County",
        "categories": ["Housing", "Employment", "Family", "Consumer", "General"],
        "source": "curated",
    },
]


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        existing = (await session.execute(select(LegalResource.id))).scalars().all()
        existing_ids = set(existing)

        added = 0
        for row in SEED_DATA:
            if row["id"] in existing_ids:
                continue
            session.add(LegalResource(**row))
            added += 1

        await session.commit()
        logger.info("Seeded %d new resources (%d already existed)", added, len(existing_ids))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed())
