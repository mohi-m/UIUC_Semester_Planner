from fastapi import APIRouter, Query, Path, HTTPException, status
from typing import Optional
from datetime import datetime
from app.services.pathway_service import PathwayService
from app.services.recommendation_service import RecommendationService
from app.schemas.requests import RecommendationRequest
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/pathways", tags=["Pathways"])


@router.get("")
async def get_pathways():
    """Get all pathways"""

    try:
        pathways = PathwayService.get_all_pathways()

        return {
            "success": True,
            "data": {"pathways": pathways},
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    except Exception as e:
        logger.error(f"Error fetching pathways: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.get("/{pathwayId}")
async def get_pathway(pathwayId: str = Path(..., description="Pathway identifier")):
    """Get pathway by ID"""

    try:
        pathway = PathwayService.get_pathway_by_id(pathwayId)

        if not pathway:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pathway with ID '{pathwayId}' not found",
            )

        return {
            "success": True,
            "data": pathway,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching pathway {pathwayId}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.get("/{pathwayId}/courses")
async def get_pathway_courses(
    pathwayId: str = Path(..., description="Pathway identifier"),
    type: str = Query("all", enum=["core", "recommended", "optional", "all"]),
    include_details: bool = Query(False, description="Include full course details"),
):
    """Get courses for a pathway"""

    try:
        result = PathwayService.get_pathway_courses(
            pathway_id=pathwayId, course_type=type, include_details=include_details
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pathway with ID '{pathwayId}' not found",
            )

        return {
            "success": True,
            "data": result,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching courses for pathway {pathwayId}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.post("/{pathwayId}/recommend")
async def get_recommendations(
    pathwayId: str = Path(..., description="Pathway identifier"),
    request: Optional[RecommendationRequest] = None,
):
    """Get course recommendations for a pathway"""

    try:
        if not request:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request body is required",
            )

        # Get recommendations
        result = RecommendationService.get_recommendations(
            pathway_id=pathwayId,
            completed_courses=request.completed_courses,
            current_semester=request.current_semester,
            credits_per_semester=request.credits_per_semester,
            preferences=request.preferences,
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pathway with ID '{pathwayId}' not found",
            )

        return {
            "success": True,
            "data": result,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating recommendations for {pathwayId}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )
