from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class RecommendationRequest(BaseModel):
    """Request model for course recommendations"""

    completed_courses: List[str]
    current_semester: str  # "spring", "fall", "summer"
    credits_per_semester: int = 15
    preferences: Optional[Dict[str, Any]] = None
