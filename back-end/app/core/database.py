import os
from pymongo import MongoClient
from pymongo.collection import Collection
from app.core.config import settings
from app.core.logging import get_logger
from contextlib import contextmanager

logger = get_logger(__name__)


class MongoDBClient:
    """MongoDB client for database operations"""

    _instance = None
    _client = None
    _db = None

    @classmethod
    def get_instance(cls):
        """Get singleton instance of MongoDBClient"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        """Initialize MongoDB connection"""
        if MongoDBClient._client is None:
            try:
                # Allow a sane default for server selection/connect timeouts if not provided via URI
                timeout_ms = int(os.getenv("MONGODB_TIMEOUT_MS", "10000"))
                MongoDBClient._client = MongoClient(
                    settings.MONGODB_URL,
                    serverSelectionTimeoutMS=timeout_ms,
                    connectTimeoutMS=timeout_ms,
                )
                # Test connection
                MongoDBClient._client.admin.command("ping")
                logger.info("Connected to MongoDB successfully")
            except Exception as e:
                logger.error(f"Failed to connect to MongoDB: {str(e)}")
                raise

        if MongoDBClient._db is None:
            MongoDBClient._db = MongoDBClient._client[settings.MONGODB_DB_NAME]

    @staticmethod
    def get_database():
        """Get database instance"""
        if MongoDBClient._db is None:
            MongoDBClient.get_instance()
        return MongoDBClient._db

    @staticmethod
    def get_collection(collection_name: str) -> Collection:
        """Get a specific collection"""
        db = MongoDBClient.get_database()
        if db is None:
            raise RuntimeError("Database not initialized")
        return db[collection_name]

    @staticmethod
    def close():
        """Close MongoDB connection"""
        if MongoDBClient._client:
            MongoDBClient._client.close()
            MongoDBClient._client = None
            MongoDBClient._db = None
            logger.info("MongoDB connection closed")


# Do not initialize on module import to avoid fork-safety issues with pre-fork servers
