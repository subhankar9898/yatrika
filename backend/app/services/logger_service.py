import asyncio
from datetime import datetime, timezone
from app.db.mongo_client import get_mongo_db


def log_activity_background(event_type: str, user_id=None, ip_address: str = "unknown", details: dict = None):
    """
    Safely schedules a MongoDB activity log insert without blocking.
    Works when called from both sync and async contexts.
    """
    db = get_mongo_db()
    if db is None:
        return

    doc = {
        "event_type": event_type,
        "user_id": user_id,
        "ip_address": ip_address,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc)
    }

    try:
        # Get the running event loop and schedule the coroutine safely
        loop = asyncio.get_running_loop()
        loop.create_task(db.activity_logs.insert_one(doc))
    except RuntimeError:
        # No running event loop — skip logging silently
        pass
