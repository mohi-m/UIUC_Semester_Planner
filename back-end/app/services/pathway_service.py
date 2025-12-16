from typing import Optional, List, Dict, Any
from app.core.database import MongoDBClient
from app.utils.serialization import to_jsonable
from bson import ObjectId
from bson.errors import InvalidId
from app.core.logging import get_logger

logger = get_logger(__name__)


class PathwayService:
    """Service for pathway-related database operations"""

    COLLECTION_NAME = "career_paths"

    @staticmethod
    def get_collection():
        """Get pathways collection"""
        return MongoDBClient.get_collection(PathwayService.COLLECTION_NAME)

    @staticmethod
    def get_all_pathways() -> List[Dict]:
        """Get all pathways"""
        collection = PathwayService.get_collection()
        docs = list(collection.find({}))
        return to_jsonable(docs)

    @staticmethod
    def get_pathway_by_id(pathway_id: str) -> Optional[Dict]:
        """Get a single pathway by ID"""
        collection = PathwayService.get_collection()
        try:
            obj_id = ObjectId(pathway_id)
        except Exception:
            return None
        doc = collection.find_one({"_id": obj_id})
        return to_jsonable(doc) if doc else None

    @staticmethod
    def get_pathway_courses(
        pathway_id: str, course_type: str = "all", include_details: bool = False
    ) -> Optional[Dict]:
        """
        Get courses for a pathway

        Args:
            pathway_id: Pathway identifier
            course_type: "core", "recommended", "optional", or "all"
            include_details: If True, return full course objects; if False, return just IDs
        """
        pathway = PathwayService.get_pathway_by_id(pathway_id)
        if not pathway:
            return None

        result = {"pathway_id": pathway_id, "courses": {}}

        # Get course IDs based on type
        course_types = ["core", "recommended", "optional"]
        if course_type != "all":
            course_types = [course_type]

        from app.services.course_service import CourseService

        collection = CourseService.get_collection()

        for ct in course_types:
            course_ids = pathway.get(f"{ct}_courses", [])

            if include_details:
                # Get full course details
                courses = list(collection.find({"course_id": {"$in": course_ids}}))
                result["courses"][ct] = to_jsonable(courses)
            else:
                # Just return IDs
                result["courses"][ct] = course_ids

        return result
