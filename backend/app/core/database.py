from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

_client = None
UNUSED_COLLECTIONS = ("orders", "vendors", "activities")


async def _drop_unused_collections():
    db = get_db()
    existing = set(await db.list_collection_names())
    for name in UNUSED_COLLECTIONS:
        if name in existing:
            await db[name].drop()


async def connect_db():
    global _client
    try:
        _client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=5000,
        )
        await _client.admin.command("ping")
    except Exception:
        from mongomock_motor import AsyncMongoMockClient
        _client = AsyncMongoMockClient()
    await _drop_unused_collections()


async def close_db():
    global _client
    if _client:
        _client.close()
    _client = None


def get_db():
    assert _client is not None, "Database client not initialised"
    return _client[settings.DATABASE_NAME]
