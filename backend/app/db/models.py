from sqlalchemy import Column, String, ARRAY
from app.db.database import Base


class LegalResource(Base):
    __tablename__ = "legal_resources"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    state = Column(String, nullable=False, index=True)
    city = Column(String, nullable=True)
    county = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    address = Column(String, nullable=True)
    coverage = Column(String, nullable=True)
    categories = Column(ARRAY(String), nullable=False)
    source = Column(String, nullable=False, default="curated")
