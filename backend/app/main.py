from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services.classifier import classifier_service
from app.api.analyze import router as analyze_router
from app.api.resources import router as resources_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    classifier_service.load_model()
    yield
    classifier_service.unload_model()


app = FastAPI(title="Legal Shield API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router, prefix="/api")
app.include_router(resources_router, prefix="/api")
