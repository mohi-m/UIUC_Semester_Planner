import { CodeBracketIcon, ChartBarIcon, CpuChipIcon, BriefcaseIcon, BeakerIcon, Squares2X2Icon } from "@heroicons/react/24/outline";

// Define the API base URL (use Vite env variable `VITE_API_BASE_URL`)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// Types matching the Backend response structure roughly
export interface Pathway {
    _id: { $oid: string } | string;
    name: string;
    description: string;
    required_skills: string[];
    core_courses: string[];
    recommended_courses: string[];
    optional_courses: string[];
}

// Frontend Career Path Type
export interface CareerPath {
    id: string;
    label: string;
    icon: any; // HeroIcon type
    color: string;
}

// Helper to map backend data to frontend UI requirements
// ... (start mapPathwayToCareerPath)
export const fetchPathwayDetails = async (pathwayId: string): Promise<Pathway | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/pathways`);
        if (!response.ok) {
            throw new Error(`Failed to fetch pathways: ${response.statusText}`);
        }
        const json = await response.json();
        const pathwaysData: Pathway[] = json.data?.pathways || [];

        return pathwaysData.find(p => {
            const pId = typeof p._id === 'string' ? p._id : p._id.$oid;
            return pId === pathwayId;
        }) || null;
    } catch (error) {
        console.error("Error fetching pathway details:", error);
        return null;
    }
};

export const fetchPathways = async (): Promise<CareerPath[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/pathways`);
        if (!response.ok) {
            throw new Error(`Failed to fetch pathways: ${response.statusText}`);
        }
        const json = await response.json();

        // The backend returns { success: true, data: { pathways: [...] } }
        // based on pathways.py: return { "success": True, "data": {"pathways": pathways} }
        const pathwaysData: Pathway[] = json.data?.pathways || [];

        return pathwaysData.map(mapPathwayToCareerPath);
    } catch (error) {
        console.error("Error calling fetchPathways:", error);
        return [];
    }
};

// Helper to map backend data to frontend UI requirements
const mapPathwayToCareerPath = (pathway: Pathway): CareerPath => {
    const id = typeof pathway._id === 'string' ? pathway._id : pathway._id.$oid;
    const label = pathway.name;

    return {
        id,
        label,
        icon: getCareerIcon(label),
        color: getCareerColor(label),
    };
};

const getCareerIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("software")) return CodeBracketIcon;
    if (lower.includes("data") && lower.includes("analyst")) return ChartBarIcon;
    if (lower.includes("machine") || lower.includes("ml") || lower.includes("ai")) return CpuChipIcon;
    if (lower.includes("product")) return BriefcaseIcon;
    if (lower.includes("research")) return BeakerIcon;
    if (lower.includes("science") || lower.includes("scientist")) return Squares2X2Icon;
    // Fallback
    return BriefcaseIcon;
};

const getCareerColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("software")) return "#2563eb"; // Blue
    if (lower.includes("data") && lower.includes("analyst")) return "#22c55e"; // Green
    if (lower.includes("machine") || lower.includes("ml") || lower.includes("ai")) return "#a855f7"; // Purple
    if (lower.includes("product")) return "#f97316"; // Orange
    if (lower.includes("research")) return "#ec4899"; // Pink
    if (lower.includes("science") || lower.includes("scientist")) return "#6366f1"; // Indigo
    // Fallback
    return "#64748b"; // Slate
};
