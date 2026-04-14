from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.mysql_session import Base, engine
from app.db.mongo_client import connect_mongo, close_mongo
from app.db.redis_client import connect_redis, close_redis
from app.models import mysql   # noqa — registers all core models
from app.models import extra   # noqa — registers Notification, GuideBlockedDate

from app.api.v1 import auth, places, guides, bookings, admin, notifications, exports


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"🚀 Starting {settings.APP_NAME} API...")
    if engine:
        Base.metadata.create_all(bind=engine)
        print("✅ MySQL tables ready")
    try:
        await connect_mongo()
    except Exception as e:
        print("MongoDB skipped:", e)
    await connect_redis()
    print(f"✅ {settings.APP_NAME} API is live!")
    yield
    
    try:
        await close_mongo()
    except Exception as e:
        print("Mongo close skipped:", e)
    
    try:
        await close_redis()
    except Exception as e:
        print("Redis close skipped:", e)


app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description="Cloud-Based Smart Tourism Platform with Anomaly Detection",
    version="1.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(auth.router,          prefix=PREFIX)
app.include_router(places.router,        prefix=PREFIX)
app.include_router(guides.router,        prefix=PREFIX)
app.include_router(bookings.router,      prefix=PREFIX)
app.include_router(admin.router,         prefix=PREFIX)
app.include_router(notifications.router, prefix=PREFIX)
app.include_router(exports.router,       prefix=PREFIX)


@app.get("/")
def root():
    return {"app": settings.APP_NAME, "version": "1.1.0", "docs": "/api/docs"}

@app.get("/health")
def health():
    return {"status": "healthy"}
