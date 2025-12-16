from fastapi import APIRouter, Query, Path, HTTPException, status
from typing import Optional
from datetime import datetime
from app.services.tagged_course_service import TaggedCourseService
from app.schemas.responses import (
    TaggedCourseListResponse,
    TaggedCourseDetailResponse,
)
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/tagged-courses", tags=["Tagged Courses"])


@router.get("", response_model=TaggedCourseListResponse)
async def list_tagged_courses(
    course_id: Optional[str] = Query(None, description="Filter by course_id"),
    skills: Optional[str] = Query(
        None, description="Filter by skills (comma-separated)"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=1000, description="Items per page"),
):
    """List tagged courses with optional filters and pagination"""

    try:
        # If skills provided, use search; else use filters
        if skills:
            skills_list = [s.strip() for s in skills.split(",") if s.strip()]
            items, total = TaggedCourseService.search_by_skills(
                skills_list, page=page, limit=limit
            )
        else:
            filters = {}
            if course_id:
                filters["course_id"] = course_id
            items, total = TaggedCourseService.get_all(
                filters if filters else None, page=page, limit=limit
            )

        total_pages = (total + limit - 1) // limit

        return TaggedCourseListResponse(
            success=True,
            data={
                "items": items,
                "pagination": {
                    "current_page": page,
                    "total_pages": total_pages,
                    "total_items": total,
                    "items_per_page": limit,
                    "has_next": page < total_pages,
                    "has_prev": page > 1,
                },
            },
            timestamp=datetime.utcnow().isoformat() + "Z",
        )

    except Exception as e:
        logger.error(f"Error listing tagged courses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.get("/{courseId}", response_model=TaggedCourseDetailResponse)
async def get_tags_for_course(courseId: str = Path(..., description="Course ID")):
    """Get the tags/skills for a specific course"""

    try:
        doc = TaggedCourseService.get_by_course_id(courseId)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No tags found for course '{courseId}'",
            )

        return TaggedCourseDetailResponse(
            success=True,
            data=doc,
            timestamp=datetime.utcnow().isoformat() + "Z",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tags for course {courseId}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )
