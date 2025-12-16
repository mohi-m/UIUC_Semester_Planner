export interface Course {
    course_id: string;
    title: string;
    department?: string;
    credit_hours?: number | string | number[];
    course_avg_difficulty?: number;
    course_avg_gpa?: number;
    description?: string;
    instructors?: any;
    semesters?: string[];
    course_avg_rating?: number;
    prerequisites?: string[]; // Array of course IDs or names
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchCourses = async (limit: number = 1000): Promise<Course[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/courses?limit=${limit}`);
        if (!res.ok) {
            throw new Error(`Request failed with status ${res.status}`);
        }
        const json = await res.json();
        return json?.data?.courses ?? [];
    } catch (error) {
        console.error("Error fetching courses:", error);
        throw error;
    }
};

export const searchCourses = async (query: string, limit: number = 100): Promise<Course[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/courses/search?q=${encodeURIComponent(query)}&limit=${limit}`);
        if (!res.ok) {
            throw new Error(`Request failed with status ${res.status}`);
        }
        const json = await res.json();
        return json?.data?.courses ?? [];
    } catch (error) {
        console.error("Error searching courses:", error);
        throw error;
    }
};

export const fetchCourseDetails = async (courseId: string): Promise<Course | null> => {
    try {
        const results = await searchCourses(courseId, 1);
        if (results.length > 0) {
            return results[0];
        }
        return null;
    } catch (error) {
        console.error(`Error fetching details for course ${courseId}:`, error);
        return null;
    }
};
