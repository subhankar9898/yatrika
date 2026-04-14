import redis.asyncio as aioredis
from app.core.config import settings

redis_client: aioredis.Redis = None


async def connect_redis():
    global redis_client
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    await redis_client.ping()
    print("✅ Redis connected")


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()


def get_redis() -> aioredis.Redis:
    return redis_client


# ─── OTP Rate Limiting Helpers ──────────────────────────────────────────────

async def check_otp_rate_limit(email: str) -> bool:
    """Returns True if allowed, False if rate limited (max 3 OTPs per 15 min)."""
    key = f"otp_rate:{email}"
    count = await redis_client.get(key)
    if count and int(count) >= 3:
        return False
    pipe = redis_client.pipeline()
    pipe.incr(key)
    pipe.expire(key, 900)  # 15 minutes
    await pipe.execute()
    return True


async def check_login_attempts(email: str) -> bool:
    """Returns True if allowed, False if too many failed logins (max 5 in 10 min)."""
    key = f"login_fail:{email}"
    count = await redis_client.get(key)
    return not (count and int(count) >= 5)


async def record_failed_login(email: str):
    key = f"login_fail:{email}"
    pipe = redis_client.pipeline()
    pipe.incr(key)
    pipe.expire(key, 600)  # 10 minutes
    await pipe.execute()


async def clear_login_attempts(email: str):
    await redis_client.delete(f"login_fail:{email}")


async def blacklist_refresh_token(jti: str, expires_in_seconds: int):
    await redis_client.setex(f"blacklist:{jti}", expires_in_seconds, "1")


async def is_token_blacklisted(jti: str) -> bool:
    return bool(await redis_client.get(f"blacklist:{jti}"))
