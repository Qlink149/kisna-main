from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import connect_db, close_db
from app.api.routes import orders, vendors, activities, analytics, whatsapp, demo


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="Kisna API",
    description="Jewelry Operations & Vendor Management API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(orders.router, prefix="/api")
app.include_router(vendors.router, prefix="/api")
app.include_router(activities.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(whatsapp.router, prefix="/api")
app.include_router(demo.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
