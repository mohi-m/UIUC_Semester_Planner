from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel


# ============ Request Models ============
class RecommendationRequest(BaseModel):
    """Request model for course recommendations"""

    completed_courses: List[str]
    current_semester: str  # "spring", "fall", "summer"
    credits_per_semester: int = 15
    preferences: Optional[Dict[str, Any]] = None


class PreferenceObject(BaseModel):
    """User preferences for recommendations"""

    max_difficulty: Optional[float] = None
    preferred_instructors: Optional[List[str]] = None
    avoid_gen_eds: bool = False
    prioritize_pathway: bool = True


# ============ Response Models ============
class ErrorDetail(BaseModel):
    """Error details"""

    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Standard error response"""

    success: bool = False
    error: ErrorDetail
    timestamp: str


class Pagination(BaseModel):
    """Pagination information"""

    current_page: int
    total_pages: int
    total_items: int
    items_per_page: int
    has_next: bool
    has_prev: bool


class CourseListResponse(BaseModel):
    """Response for course list endpoints"""

    success: bool = True
    data: Dict[str, Any]
    timestamp: str


class CourseDetailResponse(BaseModel):
    """Response for single course endpoint"""

    success: bool = True
    data: Dict[str, Any]
    timestamp: str


class PathwayListResponse(BaseModel):
    """Response for pathway list endpoints"""

    success: bool = True
    data: Dict[str, Any]
    timestamp: str


class PathwayDetailResponse(BaseModel):
    """Response for single pathway endpoint"""

    success: bool = True
    data: Dict[str, Any]
    timestamp: str


class RecommendationResponse(BaseModel):
    """Response for course recommendations"""

    success: bool = True
    data: Dict[str, Any]
    timestamp: str


# ============ Recommendation Models ============
class CourseRecommendation(BaseModel):
    """A single course recommendation"""

    course: Dict[str, Any]
    reason: str
    priority: str  # "high", "medium", "low"
    recommended_instructor: Optional[str] = None


class RecommendationResult(BaseModel):
    """Result of recommendation request"""

    recommendations: List[CourseRecommendation]
    total_credits: int
    avg_difficulty: float
    prerequisites_satisfied: bool


# ============ Tagged Courses ============
class TaggedCourseListResponse(BaseModel):
    """Response for tagged courses list"""

    success: bool = True
    data: Dict[str, Any]
    timestamp: str


class TaggedCourseDetailResponse(BaseModel):
    """Response for a single course's tags"""

    success: bool = True
    data: Dict[str, Any]
    timestamp: str
