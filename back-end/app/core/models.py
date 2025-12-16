from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


# ============ Domain Models (Core Models) ============
class InstructorStats(BaseModel):
    """Statistics for an instructor teaching a course"""

    rating: Optional[float] = None
    difficulty: Optional[float] = None
    avg_gpa: Optional[float] = None


class PrerequisiteNode(BaseModel):
    """Represents a single node in prerequisite tree"""

    type: str  # "AND" or "OR"
    courses: List[Any] = []  # Can be strings or nested PrerequisiteNode


class Course(BaseModel):
    """Course domain model"""

    id: str = Field(alias="_id")
    course_id: str
    title: str
    description: Optional[str] = None
    department: str
    credit_hours: int
    gen_ed: bool = False
    semesters: List[str] = []  # ["spring", "fall", "summer"]
    course_avg_rating: Optional[float] = None
    course_avg_difficulty: Optional[float] = None
    course_avg_gpa: Optional[float] = None
    prerequisites: Optional[Dict[str, Any]] = None
    instructors: Optional[Dict[str, InstructorStats]] = None

    class Config:
        populate_by_name = True


class Pathway(BaseModel):
    """Pathway domain model"""

    id: str = Field(alias="_id")
    name: str
    description: Optional[str] = None
    skills_required: List[str] = []
    skill_weights: Optional[Dict[str, float]] = None
    core_courses: List[str] = []
    recommended_courses: List[str] = []
    optional_courses: List[str] = []

    class Config:
        populate_by_name = True
