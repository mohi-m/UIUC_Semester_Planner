from typing import Optional, List, Dict, Any, Tuple
from app.core.database import MongoDBClient
from app.core.logging import get_logger
from app.utils.serialization import to_jsonable

logger = get_logger(__name__)


class TaggedCourseService:
    """Service for tagged_courses collection"""

    COLLECTION_NAME = "tagged_courses"

    @staticmethod
    def get_collection():
        return MongoDBClient.get_collection(TaggedCourseService.COLLECTION_NAME)

    @staticmethod
    def get_all(
        filters: Optional[Dict[str, Any]] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        collection = TaggedCourseService.get_collection()
        query = filters or {}
        skip = (page - 1) * limit
        total = collection.count_documents(query)
        docs = list(collection.find(query).skip(skip).limit(limit))
        return to_jsonable(docs), total

    @staticmethod
    def get_by_course_id(course_id: str) -> Optional[Dict[str, Any]]:
        collection = TaggedCourseService.get_collection()
        doc = collection.find_one({"course_id": course_id})
        return to_jsonable(doc) if doc else None

    @staticmethod
    def search_by_skills(
        skills: List[str], page: int = 1, limit: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        collection = TaggedCourseService.get_collection()
        query = {"skills": {"$in": skills}}
        skip = (page - 1) * limit
        total = collection.count_documents(query)
        docs = list(collection.find(query).skip(skip).limit(limit))
        return to_jsonable(docs), total
