import { fetchCourseDetails, type Course } from './courseService';
import { fetchPathwayDetails } from './pathwayService';

export interface PlanResult {
    schedule: Record<string, Course[]>;
    remainingSemesters: number;
    totalCredits: number;
    completionPercentage: number;
}

export const generateAcademicPlan = async (
    currentSemester: string,
    careerPathId: string,
    completedCourses: Course[]
): Promise<PlanResult> => {
    // 1. Fetch pathway details to get required courses
    const pathway = await fetchPathwayDetails(careerPathId);
    if (!pathway) {
        throw new Error("Career path not found");
    }

    const completedCourseIds = new Set(completedCourses.map(c => c.course_id.toUpperCase()));

    // Combine core, recommended, and optional courses to have enough to fill the schedule
    // DEDUPLICATE IDs to prevent React key collisions (which break DnD)
    const allRequiredIds = Array.from(new Set([
        ...pathway.core_courses,
        ...(pathway.recommended_courses || []),
        ...(pathway.optional_courses || [])
    ]));

    const remainingCourseIds = allRequiredIds.filter(id => {
        const normalizedId = id.replace(/\s+/g, '').toUpperCase();
        const isCompleted = Array.from(completedCourseIds).some(cId => cId.replace(/\s+/g, '').toUpperCase() === normalizedId);
        return !isCompleted;
    });

    // 3. Fetch details for remaining courses
    const coursePromises = remainingCourseIds.map(async (id) => {
        const details = await fetchCourseDetails(id);
        if (details) {
            return details;
        } else {
            return {
                course_id: id,
                title: "Planned Course",
                department: id.split(' ')[0] || "UNK",
                credit_hours: 3
            } as Course;
        }
    });

    const remainingCourses = await Promise.all(coursePromises);

    // 4. Distribute into semesters
    const schedule: Record<string, Course[]> = {};
    const MAX_CREDITS_PER_SEMESTER = 15;

    let currentTerm = currentSemester;
    let currentSemesterCourses: Course[] = [];
    let currentSemesterCredits = 0;

    for (const course of remainingCourses) {
        const val = course.credit_hours;
        let credits = 3;
        if (typeof val === 'number') {
            credits = val;
        } else if (Array.isArray(val)) {
            credits = val[0] || 3;
        } else if (typeof val === 'string') {
            const match = (val as string).match(/\d+/);
            if (match) credits = parseInt(match[0], 10);
        }

        if (currentSemesterCredits + credits > MAX_CREDITS_PER_SEMESTER && currentSemesterCourses.length > 0) {
            schedule[currentTerm] = currentSemesterCourses;
            currentTerm = nextSemester(currentTerm);
            currentSemesterCourses = [];
            currentSemesterCredits = 0;
        }

        currentSemesterCourses.push(course);
        currentSemesterCredits += credits;
    }

    if (currentSemesterCourses.length > 0) {
        schedule[currentTerm] = currentSemesterCourses;
    }

    // -------------------------
    // 5. UPDATED LOGIC STARTS HERE
    // -------------------------

    // Credits the student already completed
    const completedCredits = completedCourses.reduce((sum, c) => {
        const val = c.credit_hours;
        let credits = 3;
        if (typeof val === 'number') {
            credits = val;
        } else if (Array.isArray(val)) {
            credits = val[0] || 3;
        } else if (typeof val === 'string') {
            const match = (val as string).match(/\d+/);
            if (match) credits = parseInt(match[0], 10);
        }
        return sum + credits;
    }, 0);

    const totalCredits = 120;
    const completionPercentage = Math.min(100, Math.round((completedCredits / totalCredits) * 100));

    // NEW: Semesters completed = floor(completedCredits / 12)
    const TOTAL_SEMESTERS = 8;
    const semestersCompleted = Math.floor(completedCredits / 12);
    const remainingSemesters = Math.max(TOTAL_SEMESTERS - semestersCompleted, 0);

    // Pad schedule to generate exactly `remainingSemesters`
    let simTerm: string;

    const presentSemesters = Object.keys(schedule);
    let lastTerm = presentSemesters.length > 0 ? presentSemesters[presentSemesters.length - 1] : null;

    if (lastTerm) {
        simTerm = nextSemester(lastTerm);
    } else {
        simTerm = currentSemester;
    }

    while (Object.keys(schedule).length < remainingSemesters) {
        if (!schedule[simTerm]) {
            schedule[simTerm] = [];
        }
        simTerm = nextSemester(simTerm);
    }

    // -------------------------
    // UPDATED LOGIC ENDS HERE
    // -------------------------

    return {
        schedule,
        remainingSemesters,
        totalCredits,
        completionPercentage
    };
};

// Helper: Calculate next semester (Spring 2024 -> Fall 2024 -> Spring 2025)
const nextSemester = (sem: string): string => {
    const parts = sem.split(' ');
    if (parts.length !== 2) return sem;

    const season = parts[0];
    const year = parseInt(parts[1]);

    if (isNaN(year)) return sem;

    if (season === "Spring") {
        return `Fall ${year}`;
    } else if (season === "Fall") {
        return `Spring ${year + 1}`;
    } else {
        return `Fall ${year}`;
    }
};
