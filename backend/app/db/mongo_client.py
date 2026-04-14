from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client: AsyncIOMotorClient = None


def get_mongo_client() -> AsyncIOMotorClient:
    return client


def get_mongo_db():
    return client[settings.MONGODB_DB_NAME]


async def connect_mongo():
    global client
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    # Create indexes for activity_logs collection
    db = client[settings.MONGODB_DB_NAME]
    await db.activity_logs.create_index("timestamp")
    await db.activity_logs.create_index("user_id")
    await db.activity_logs.create_index("event_type")
    await db.activity_logs.create_index([("ip_address", 1), ("event_type", 1)])
    print("✅ MongoDB connected")


async def close_mongo():
    global client
    if client:
        client.close()
        print("MongoDB connection closed")
