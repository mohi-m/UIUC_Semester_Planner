from fastapi import APIRouter, Query, Path, HTTPException, status
from typing import Optional
from datetime import datetime
from app.services.course_service import CourseService
from app.schemas.responses import CourseListResponse, CourseDetailResponse
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.get("", response_model=CourseListResponse)
async def get_courses(
    department: Optional[str] = Query(None, description="Filter by department code"),
    semester: Optional[str] = Query(
        None, description="Filter by semester availability"
    ),
    gen_ed: Optional[bool] = Query(
        None, description="Filter for general education courses"
    ),
    credit_hours: Optional[int] = Query(
        None, ge=0, le=6, description="Filter by credit hours"
    ),
    min_rating: Optional[float] = Query(
        None, ge=0, le=5, description="Minimum course rating"
    ),
    max_difficulty: Optional[float] = Query(
        None, ge=0, le=5, description="Maximum difficulty level"
    ),
    page: int = Query(1, ge=1, description="Page number for pagination"),
    limit: int = Query(20, ge=1, le=1000, description="Number of items per page"),
):
    """Get all courses with optional filtering"""

    try:
        # Build filters
        filters = {}

        if department:
            filters["department"] = department

        if semester:
            filters["semesters"] = semester

        if gen_ed is not None:
            filters["gen_ed"] = gen_ed

        if credit_hours is not None:
            filters["credit_hours"] = credit_hours

        if min_rating is not None:
            filters["course_avg_rating"] = {"$gte": min_rating}

        if max_difficulty is not None:
            filters["course_avg_difficulty"] = {"$lte": max_difficulty}

        # Get courses
        courses, total = CourseService.get_all_courses(
            filters=filters if filters else None, page=page, limit=limit
        )

        # Calculate pagination info
        total_pages = (total + limit - 1) // limit

        return CourseListResponse(
            success=True,
            data={
                "courses": courses,
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
        logger.error(f"Error fetching courses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.get("/search", response_model=CourseListResponse)
async def search_courses(
    q: Optional[str] = Query(None, description="Search query"),
    skills: Optional[str] = Query(
        None, description="Filter by skills (comma-separated)"
    ),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=1000),
):
    """Search courses by keyword or skills"""

    try:
        if not q:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Search query 'q' is required",
            )

        # Parse skills if provided
        skills_list = None
        if skills:
            skills_list = [s.strip() for s in skills.split(",")]

        # Search
        courses, total = CourseService.search_courses(
            query=q, skills=skills_list, page=page, limit=limit
        )

        total_pages = (total + limit - 1) // limit

        return CourseListResponse(
            success=True,
            data={
                "courses": courses,
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching courses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.get("/{courseId}", response_model=CourseDetailResponse)
async def get_course(courseId: str = Path(..., description="Course identifier")):
    """Get course by ID"""

    try:
        course = CourseService.get_course_by_id(courseId)

        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID '{courseId}' not found",
            )

        return CourseDetailResponse(
            success=True, data=course, timestamp=datetime.utcnow().isoformat() + "Z"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching course {courseId}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.get("/{courseId}/prerequisites")
async def get_prerequisites(courseId: str = Path(..., description="Course identifier")):
    """Get course prerequisites"""

    try:
        result = CourseService.get_prerequisites(courseId)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID '{courseId}' not found",
            )

        return {
            "success": True,
            "data": result,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching prerequisites for {courseId}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.get("/{courseId}/instructors")
async def get_instructors(
    courseId: str = Path(..., description="Course identifier"),
    sort_by: str = Query("rating", enum=["rating", "difficulty", "avg_gpa"]),
):
    """Get course instructors"""

    try:
        result = CourseService.get_instructors(courseId, sort_by=sort_by)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID '{courseId}' not found",
            )

        return {
            "success": True,
            "data": result,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching instructors for {courseId}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )
