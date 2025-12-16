from typing import Optional, List, Dict, Any
from app.core.database import MongoDBClient
from app.core.logging import get_logger
from app.services.pathway_service import PathwayService
from app.services.course_service import CourseService

logger = get_logger(__name__)


class RecommendationService:
    """Service for generating course recommendations"""

    @staticmethod
    def get_recommendations(
        pathway_id: str,
        completed_courses: List[str],
        current_semester: str,
        credits_per_semester: int = 15,
        preferences: Optional[Dict] = None,
    ) -> Optional[Dict]:
        """
        Generate personalized course recommendations

        Args:
            pathway_id: Target career pathway
            completed_courses: List of courses already completed
            current_semester: Current semester
            credits_per_semester: Target credits for next semester
            preferences: User preferences dict

        Returns:
            Recommendations with course details and reasoning
        """
        pathway = PathwayService.get_pathway_by_id(pathway_id)
        if not pathway:
            return None

        preferences = preferences or {}
        max_difficulty = preferences.get("max_difficulty", 5.0)
        preferred_instructors = preferences.get("preferred_instructors", [])
        avoid_gen_eds = preferences.get("avoid_gen_eds", False)
        prioritize_pathway = preferences.get("prioritize_pathway", True)

        collection = CourseService.get_collection()

        # Get all pathway courses
        core_courses = pathway.get("core_courses", [])
        recommended_courses = pathway.get("recommended_courses", [])
        optional_courses = pathway.get("optional_courses", [])

        # Filter out completed courses
        available_core = [c for c in core_courses if c not in completed_courses]
        available_recommended = [
            c for c in recommended_courses if c not in completed_courses
        ]
        available_optional = [c for c in optional_courses if c not in completed_courses]

        recommendations = []
        total_credits = 0
        total_difficulty = 0
        course_count = 0

        # Get course details and apply filters
        def score_and_filter_courses(course_ids, priority, reason_prefix):
            """Score courses and apply filters"""
            nonlocal recommendations, total_credits, total_difficulty, course_count

            for course_id in course_ids:
                course = collection.find_one({"course_id": course_id})
                if not course:
                    continue

                # Check filters
                difficulty = course.get("course_avg_difficulty", 0)
                if difficulty > max_difficulty:
                    continue

                is_gen_ed = course.get("gen_ed", False)
                if avoid_gen_eds and is_gen_ed:
                    continue

                # Check availability for current semester
                semesters = course.get("semesters", [])
                if current_semester not in semesters:
                    continue

                # Calculate remaining credits
                course_credits = course.get("credit_hours", 3)
                if total_credits + course_credits > credits_per_semester:
                    continue

                # Find best instructor if preferred ones available
                recommended_instructor = None
                if preferred_instructors:
                    instructors = course.get("instructors", {})
                    for pref_instr in preferred_instructors:
                        if pref_instr in instructors:
                            recommended_instructor = pref_instr
                            break

                # Add recommendation
                recommendations.append(
                    {
                        "course": course,
                        "reason": reason_prefix,
                        "priority": priority,
                        "recommended_instructor": recommended_instructor,
                    }
                )

                total_credits += course_credits
                total_difficulty += difficulty
                course_count += 1

                if total_credits >= credits_per_semester:
                    break

        # Score courses by priority
        if prioritize_pathway:
            score_and_filter_courses(available_core, "high", "Core course for pathway")
            if total_credits < credits_per_semester:
                score_and_filter_courses(
                    available_recommended, "medium", "Recommended for pathway"
                )
            if total_credits < credits_per_semester:
                score_and_filter_courses(
                    available_optional, "low", "Optional pathway course"
                )
        else:
            score_and_filter_courses(
                available_recommended, "high", "Recommended course"
            )
            score_and_filter_courses(
                available_core, "medium", "Core course for pathway"
            )
            score_and_filter_courses(
                available_optional, "low", "Optional pathway course"
            )

        avg_difficulty = total_difficulty / course_count if course_count > 0 else 0

        return {
            "recommendations": recommendations,
            "total_credits": total_credits,
            "avg_difficulty": avg_difficulty,
            "prerequisites_satisfied": True,  # Simplified - should check prerequisites
        }
