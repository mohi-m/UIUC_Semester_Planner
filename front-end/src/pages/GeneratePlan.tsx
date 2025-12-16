import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import type { Course } from "../services/courseService";
import { searchCourses, fetchCourseDetails } from "../services/courseService";
import { generateAcademicPlan } from "../services/planService";
import { fetchPathwayDetails, fetchPathways, type CareerPath } from "../services/pathwayService";
import "../styles/dashboard.css";
// import type { CareerPath } from "../services/pathwayService";

import {
  CalendarDaysIcon,
  BriefcaseIcon,
  ChartBarIcon,
  BookOpenIcon,
  UserGroupIcon,
  XMarkIcon,
  SparklesIcon,
  UserCircleIcon,
  CheckIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

// ----- Types -----
interface DashboardState {
  major: string;
  careerPathId: string;
  careerPathName?: string;
  selectedCourses: Course[];
  completedPrevCourses?: Course[];
  currentTermCourses?: Course[];
  startingSemester?: string;
  currentSemester: string;
}

interface SemesterPlan {
  name: string;
  courses: Course[];
  totalCredits: number;
}

const TOTAL_CREDITS_REQUIRED = 120;

// Helper: Get numeric credits for calculation (Moved outside for shared usage)
const getNumericCredits = (val: any): number => {
  if (typeof val === "number") return val;
  if (Array.isArray(val)) return val[0] || 3;
  if (typeof val === "string") {
    const match = val.match(/\d+/);
    return match ? parseInt(match[0], 10) : 3;
  }
  if (typeof val === "object" && val !== null) {
    return val.min || val.max || val.credits || 3;
  }
  return 3;
};

const GeneratePlan: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as DashboardState;

  // --- State ---
  const [schedule, setSchedule] = useState<SemesterPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [recommendations, setRecommendations] = useState<Course[]>([]);

  // Career Path State
  const [currentCareerPathId, setCurrentCareerPathId] = useState(state?.careerPathId || "");
  const [currentCareerPathName, setCurrentCareerPathName] = useState(
    state?.careerPathName || state?.careerPathId || ""
  );
  const [availablePathways, setAvailablePathways] = useState<CareerPath[]>([]);
  const [isCareerDropdownOpen, setIsCareerDropdownOpen] = useState(false);

  // --- Add Elective Search State ---
  const [activeSemesterIndex, setActiveSemesterIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Course[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Helpers for terms
  // Upcoming major semester (skip Summer)
  const nextSemester = (sem: string): string => {
    const parts = sem.split(" ");
    if (parts.length !== 2) return sem;
    const season = parts[0];
    const year = parseInt(parts[1]);
    if (isNaN(year)) return sem;
    if (season === "Spring") return `Fall ${year}`;
    if (season === "Summer") return `Fall ${year}`; // Summer -> Fall
    if (season === "Fall") return `Spring ${year + 1}`;
    return sem;
  };

  // Previous major semester (Spring/Fall only)
  const previousSemester = (sem: string): string => {
    const parts = sem.split(" ");
    if (parts.length !== 2) return sem;
    const season = parts[0];
    const year = parseInt(parts[1]);
    if (isNaN(year)) return sem;
    if (season === "Spring") return `Fall ${year - 1}`;
    if (season === "Fall") return `Spring ${year}`;
    return sem;
  };

  const prevCourses: Course[] = state?.completedPrevCourses ?? state?.selectedCourses ?? [];
  const currCourses: Course[] = state?.currentTermCourses ?? [];

  // Derived state for progress: count finished credits only
  const completedCredits =
    prevCourses.reduce((sum, c) => {
      return sum + getNumericCredits(c.credit_hours);
    }, 0) || 0;

  const progressPercentage = Math.min(Math.round((completedCredits / TOTAL_CREDITS_REQUIRED) * 100), 100);

  // --- Effects ---
  useEffect(() => {
    if (!state) {
      navigate("/planner"); // Redirect if no state
      return;
    }

    // Fetch available pathways on mount
    const loadPathways = async () => {
      const paths = await fetchPathways();
      setAvailablePathways(paths);
    };
    loadPathways();
  }, [state, navigate]);

  // Effect to load data whenever dependencies change (including career path)
  useEffect(() => {
    if (!state || !currentCareerPathId) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // 1. Generate Schedule
        const result = await generateAcademicPlan(
          nextSemester(state.currentSemester),
          currentCareerPathId, // Use local state
          [...prevCourses, ...currCourses]
        );

        const newSchedule: SemesterPlan[] = Object.entries(result.schedule).map(([semName, courses]) => ({
          name: semName,
          courses: courses,
          totalCredits: courses.reduce((sum, c) => sum + getNumericCredits(c.credit_hours), 0),
        }));

        setSchedule(newSchedule);

        // 2. Fetch Recommendations (Core Courses from Pathway)
        const pathway = await fetchPathwayDetails(currentCareerPathId); // Use local state
        if (pathway && pathway.core_courses) {
          // Take top 4-5 core courses
          const topCourses = pathway.core_courses.slice(0, 5);
          console.log("Fetching recs for:", topCourses);

          const courseDetailsPromises = topCourses.map((id) => fetchCourseDetails(id));
          const courses = await Promise.all(courseDetailsPromises);

          const validCourses = courses.filter((c): c is Course => c !== null);
          console.log("Fetched recs data:", validCourses);

          setRecommendations(validCourses);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [state, currentCareerPathId]); // Run when career path changes

  const handleCareerChange = (path: CareerPath) => {
    if (path.id === currentCareerPathId) {
      setIsCareerDropdownOpen(false);
      return;
    }
    setCurrentCareerPathId(path.id);
    setCurrentCareerPathName(path.label);
    setIsCareerDropdownOpen(false);
    // The useEffect above will trigger data reload
  };

  // --- Helper Functions ---
  const calculateSemesterDifficulty = (courses: Course[]): string => {
    let totalDiff = 0;
    let count = 0;

    courses.forEach((c) => {
      const diff = c.course_avg_difficulty;
      if (diff !== undefined && diff !== null) {
        totalDiff += diff;
        count++;
      }
    });

    if (count === 0) return "Unknown";

    const avg = totalDiff / count;
    if (avg <= 2.5) return "Easy";
    if (avg <= 3.5) return "Medium";
    return "Hard";
  };

  const getSemesterDiffBadgeClass = (avgDiffText: string) => {
    if (avgDiffText === "Easy") return "diff-easy";
    if (avgDiffText === "Medium") return "diff-medium";
    if (avgDiffText === "Hard") return "diff-hard";
    return "";
  };

  const getInstructorName = (instructors: any): string => {
    if (!instructors) return "Staff";
    let names: string[] = [];

    if (Array.isArray(instructors)) {
      names = instructors;
    } else if (typeof instructors === "object") {
      names = Object.keys(instructors);
    } else if (typeof instructors === "string") {
      names = [instructors];
    }

    if (names.length === 0) return "Staff";
    const distinct = Array.from(new Set(names));
    return distinct
      .slice(0, 2)
      .map((name) => name.replace(",", ""))
      .join(", ");
  };

  const formatCredits = (val: any): string | number => {
    if (Array.isArray(val)) return val[0] || 3;
    if (typeof val === "number") return val;
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null) {
      return val.min || val.max || val.credits || 3;
    }
    return 3;
  };

  const formatSemesters = (sem: any): string => {
    if (!sem) return "Fall, Spring";
    if (Array.isArray(sem)) return sem.join(", ");
    if (typeof sem === "string") return sem;
    if (typeof sem === "object") {
      return Object.values(sem).join(", ") || "Fall, Spring";
    }
    return "Unknown";
  };

  // --- Search Handlers ---
  const handleAddElectiveClick = (semIndex: number) => {
    setActiveSemesterIndex(semIndex);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchCourses(query);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const addCourseToSemester = (course: Course) => {
    if (activeSemesterIndex === null) return;

    setSchedule((prev) => {
      const newSchedule = [...prev];
      const targetSem = { ...newSchedule[activeSemesterIndex] };

      // Check if course already exists in this semester
      if (targetSem.courses.some((c) => c.course_id === course.course_id)) {
        alert("This course is already in the semester!");
        return prev;
      }

      // Check 15 credit limit
      const additionalButtons = getNumericCredits(course.credit_hours);
      if (targetSem.totalCredits + additionalButtons > 15) {
        alert("Cannot add course. Semester limit is 15 credits.");
        return prev;
      }

      // Add course
      targetSem.courses = [...targetSem.courses, course];

      // Recalculate credits
      targetSem.totalCredits = targetSem.courses.reduce((sum, c) => sum + getNumericCredits(c.credit_hours), 0);

      newSchedule[activeSemesterIndex] = targetSem;
      return newSchedule;
    });

    // Close modal
    setActiveSemesterIndex(null);
  };

  // --- Drag and Drop State & Handlers ---
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, course: Course, fromIndex: number) => {
    e.dataTransfer.setData("courseId", course.course_id);
    e.dataTransfer.setData("fromIndex", fromIndex.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    const courseId = e.dataTransfer.getData("courseId");
    const fromIndexStr = e.dataTransfer.getData("fromIndex");

    if (!courseId || !fromIndexStr) return;

    const fromIndex = parseInt(fromIndexStr, 10);
    if (fromIndex === toIndex) return;

    // Logic Check: Max 15 Credits for Drag and Drop
    const sourceSemTest = schedule[fromIndex];
    const destSemTest = schedule[toIndex];
    const courseToMove = sourceSemTest.courses.find((c) => c.course_id === courseId);

    if (courseToMove) {
      const courseCredits = getNumericCredits(courseToMove.credit_hours);
      if (destSemTest.totalCredits + courseCredits > 15) {
        alert("A semester cannot exceed 15 credits.");
        return;
      }
    }

    setSchedule((prev) => {
      const newSchedule = [...prev];
      const sourceSem = { ...newSchedule[fromIndex] };
      const destSem = { ...newSchedule[toIndex] };

      sourceSem.courses = [...sourceSem.courses];
      destSem.courses = [...destSem.courses];

      const courseIndex = sourceSem.courses.findIndex((c) => c.course_id === courseId);
      if (courseIndex === -1) return prev;

      const [movedCourse] = sourceSem.courses.splice(courseIndex, 1);
      destSem.courses.push(movedCourse);

      const calcCredits = (courses: Course[]) =>
        courses.reduce((sum, c) => {
          return sum + getNumericCredits(c.credit_hours);
        }, 0);

      sourceSem.totalCredits = calcCredits(sourceSem.courses);
      destSem.totalCredits = calcCredits(destSem.courses);

      newSchedule[fromIndex] = sourceSem;
      newSchedule[toIndex] = destSem;

      return newSchedule;
    });
  };

  // Add a selected course into the earliest semester that has room (<= 15 credits)
  const addCourseToAnySemester = (course: Course) => {
    const courseCredits = getNumericCredits(course.credit_hours);

    setSchedule((prev) => {
      // Prevent duplicates anywhere
      if (prev.some((sem) => sem.courses.some((c) => c.course_id === course.course_id))) {
        return prev;
      }

      // Find earliest semester with enough remaining credits
      for (let i = 0; i < prev.length; i++) {
        const sem = prev[i];
        if (sem.totalCredits + courseCredits <= 15) {
          const newSchedule = [...prev];
          const updatedSem: SemesterPlan = {
            ...sem,
            courses: [...sem.courses, course],
          };
          updatedSem.totalCredits = updatedSem.courses.reduce((sum, c) => sum + getNumericCredits(c.credit_hours), 0);
          newSchedule[i] = updatedSem;
          return newSchedule;
        }
      }

      alert("No semester has room under 15 credits. Remove a course or use '+ Add Elective' to rearrange.");
      return prev;
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleLogoClick = () => {
    navigate("/planner", {
      state: {
        major: state.major,
        careerPathId: currentCareerPathId,
        careerPathName: currentCareerPathName,
        selectedCourses: state.selectedCourses,
        completedPrevCourses: prevCourses,
        currentTermCourses: currCourses,
        currentSemester: state.currentSemester,
      },
    });
  };

  if (!state) return null;

  return (
    <div className="dashboard-page">
      {/* --- Elective Search Modal --- */}
      {activeSemesterIndex !== null && (
        <div className="course-modal-overlay" onClick={() => setActiveSemesterIndex(null)}>
          <div className="course-modal-featured search-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-featured-header">
              <button className="modal-close-white" onClick={() => setActiveSemesterIndex(null)}>
                <XMarkIcon className="w-6 h-6" style={{ width: "24px" }} />
              </button>
              <div className="modal-header-content">
                <h2 className="modal-course-id">Add Course to {schedule[activeSemesterIndex].name}</h2>
              </div>
            </div>

            <div className="modal-search-body">
              <input
                type="text"
                className="dashboard-search-input modal-search-input"
                placeholder="Search by course ID (e.g. CS 440)..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
              />

              <div className="search-results-list">
                {isSearching && <div className="result-item loading">Searching...</div>}

                {!isSearching && searchResults.length === 0 && searchQuery.length > 2 && (
                  <div className="result-item">No courses found.</div>
                )}

                {searchResults.slice(0, 5).map((course) => (
                  <div key={course.course_id} className="result-item" onClick={() => addCourseToSemester(course)}>
                    <div className="result-info">
                      <span className="result-id">{course.course_id}</span>
                      <span className="result-title">{course.title}</span>
                    </div>
                    <div className="result-meta">
                      <span className="badge-gray">{getNumericCredits(course.credit_hours)} Cr</span>
                      <button className="btn-add-mini">+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Course Details Modal (Existing) --- */}
      {selectedCourse && (
        <div className="course-modal-overlay" onClick={() => setSelectedCourse(null)}>
          <div className="course-modal-featured" onClick={(e) => e.stopPropagation()}>
            <div className="modal-featured-header">
              <button className="modal-close-white" onClick={() => setSelectedCourse(null)}>
                <XMarkIcon className="w-6 h-6" style={{ width: "24px" }} />
              </button>
              <div className="modal-header-content">
                <h2 className="modal-course-id">{selectedCourse.course_id}</h2>
                <h3 className="modal-course-title">{selectedCourse.title}</h3>

                <div className="modal-header-badges">
                  {(() => {
                    const diff = selectedCourse.course_avg_difficulty;
                    let diffLabel = "Unknown";
                    let badgeClass = "badge-medium";
                    if (diff !== undefined && diff !== null) {
                      if (diff <= 2.5) {
                        diffLabel = "Easy";
                        badgeClass = "badge-easy";
                      } else if (diff <= 3.5) {
                        diffLabel = "Medium";
                        badgeClass = "badge-medium";
                      } else {
                        diffLabel = "Hard";
                        badgeClass = "badge-hard";
                      }
                    }
                    return <span className={`badge ${badgeClass}`}>{diffLabel}</span>;
                  })()}
                  <span className="modal-header-credits">{formatCredits(selectedCourse.credit_hours)} credits</span>
                </div>
              </div>
            </div>

            <div className="modal-featured-body">
              <div className="modal-row">
                <div className="modal-icon-col">
                  <BookOpenIcon className="w-5 h-5 text-orange-500" style={{ width: "20px", color: "#f97316" }} />
                  <h4>Overview</h4>
                </div>
                <div className="modal-content-col">
                  <p>{selectedCourse.description || "No description available for this course."}</p>
                </div>
              </div>
              <div className="modal-row">
                <div className="modal-icon-col">
                  <UserGroupIcon className="w-5 h-5 text-orange-500" style={{ width: "20px", color: "#f97316" }} />
                  <h4>Instructors</h4>
                </div>
                <div className="modal-content-col">
                  <div className="chip-list">
                    <span className="chip-gray">{getInstructorName(selectedCourse.instructors)}</span>
                  </div>
                </div>
              </div>
              <div className="modal-row">
                <div className="modal-icon-col">
                  <ChartBarIcon className="w-5 h-5 text-orange-500" style={{ width: "20px", color: "#f97316" }} />
                  <h4>Historical GPA Trend</h4>
                </div>
                <div className="modal-content-col">
                  <div className="gpa-display">
                    {selectedCourse.course_avg_gpa ? (
                      <>
                        <span className="gpa-large">{Number(selectedCourse.course_avg_gpa).toFixed(2)}</span>
                        <span className="gpa-label">Average GPA</span>
                      </>
                    ) : (
                      <span className="text-gray-400">Data Unavailable</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-row">
                <div className="modal-icon-col">
                  <CalendarDaysIcon className="w-5 h-5 text-orange-500" style={{ width: "20px", color: "#f97316" }} />
                  <h4>Available Semesters</h4>
                </div>
                <div className="modal-content-col">
                  <p>{formatSemesters(selectedCourse.semesters)}</p>
                </div>
              </div>
            </div>

            <div className="modal-featured-footer">
              <button className="btn-secondary" onClick={() => setSelectedCourse(null)}>
                Close
              </button>
              {/* Check if course is in plan to show Remove, otherwise show Add (or nothing) */}
              {schedule.some((sem) => sem.courses.some((c) => c.course_id === selectedCourse.course_id)) ? (
                <button
                  className="btn-danger"
                  onClick={() => {
                    setSchedule((prev) => {
                      const newSchedule = [...prev];
                      for (let i = 0; i < newSchedule.length; i++) {
                        const sem = { ...newSchedule[i] };
                        const courseIdx = sem.courses.findIndex((c) => c.course_id === selectedCourse.course_id);
                        if (courseIdx !== -1) {
                          sem.courses = [...sem.courses];
                          sem.courses.splice(courseIdx, 1);
                          sem.totalCredits = sem.courses.reduce((sum, c) => sum + getNumericCredits(c.credit_hours), 0);
                          newSchedule[i] = sem;
                          break; // Found and removed
                        }
                      }
                      return newSchedule;
                    });
                    setSelectedCourse(null);
                  }}
                >
                  Remove from Plan
                </button>
              ) : (
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (selectedCourse) {
                      addCourseToAnySemester(selectedCourse);
                    }
                    setSelectedCourse(null);
                  }}
                >
                  Add to Plan
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NavBar */}
      <nav className="dashboard-nav">
        <div className="dashboard-nav-content">
          <div className="dashboard-logo" onClick={handleLogoClick} style={{ cursor: "pointer" }}>
            <div className="dashboard-logo-icon">
              <img src="/uiuc-planner-icon.svg" alt="Icon" />
            </div>
            <span>UIUC Semester Planner</span>
          </div>

          <div className="dashboard-user" onClick={() => setIsProfileOpen(!isProfileOpen)}>
            <UserCircleIcon className="w-8 h-8 text-gray-400" style={{ width: "32px", height: "32px" }} />
            {isProfileOpen && (
              <div className="user-dropdown-menu">
                <button className="dropdown-item" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Grid */}
      <main className="dashboard-grid">
        {/* Left Sidebar */}
        <aside className="dashboard-sidebar-left">
          <div
            className="dashboard-card career-path-card"
            onClick={() => setIsCareerDropdownOpen(!isCareerDropdownOpen)}
          >
            <div className="card-header-icon">
              <BriefcaseIcon className="w-8 h-8 text-white" style={{ width: "32px", height: "32px" }} />
            </div>
            <div className="career-info">
              <p className="label-sm">Career Path</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3>{currentCareerPathName}</h3>
                <ChevronDownIcon style={{ width: "16px", color: "rgba(255,255,255,0.7)" }} />
              </div>
              <p className="subtitle">{state.major}</p>
            </div>

            {/* Dropdown */}
            {isCareerDropdownOpen && (
              <div className="career-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                {availablePathways.map((path) => (
                  <button key={path.id} className="career-dropdown-item" onClick={() => handleCareerChange(path)}>
                    <div className="career-dropdown-icon" style={{ color: path.color }}>
                      <path.icon />
                    </div>
                    <span>{path.label}</span>
                    {path.id === currentCareerPathId && <CheckIcon className="career-dropdown-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-card progress-card">
            <div className="card-header-row">
              <ChartBarIcon
                className="w-6 h-6 text-orange-500"
                style={{ width: "24px", height: "24px", color: "#f97316" }}
              />
              <h3>Degree Progress</h3>
            </div>

            <div className="progress-circle-container" style={{ height: "200px" }}>
              <svg viewBox="0 0 36 36" className="circular-chart" style={{ width: "100%", height: "100%" }}>
                <path
                  className="circle-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="circle"
                  strokeDasharray={`${progressPercentage}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" className="percentage">
                  {progressPercentage}%
                </text>
                <text x="18" y="25" className="lbl">
                  Complete
                </text>
              </svg>
            </div>

            <div className="progress-stats">
              <div className="stat-row">
                <span>Completed</span>
                <span className="stat-val">{completedCredits} credits</span>
              </div>
              <div className="stat-row">
                <span>Required</span>
                <span className="stat-val">{TOTAL_CREDITS_REQUIRED} credits</span>
              </div>
              <div className="stat-row highlight">
                <span>Remaining</span>
                <span className="stat-val highlight-text">
                  {Math.max(TOTAL_CREDITS_REQUIRED - completedCredits, 0)} credits
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Center: Timeline */}
        <section className="dashboard-timeline">
          <div className="section-header">
            <div>
              <h2>Your Academic Timeline</h2>
              <p>Drag and drop courses to reorganize your schedule</p>
            </div>
            {(state.startingSemester || state.currentSemester) && (
              <div style={{ textAlign: "right", color: "#6b7280" }}>
                <div>
                  <strong>Start:</strong> {state.startingSemester || "—"}
                </div>
                <div>
                  <strong>Current:</strong> {state.currentSemester}
                </div>
                <div>
                  <strong>Upcoming:</strong> {nextSemester(state.currentSemester)}
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="loading-state">Generating your perfect plan...</div>
          ) : (
            <div className="timeline-container">
              {/* Finished Semester */}
              {prevCourses.length > 0 && (
                <div className="semester-card">
                  <div className="semester-header">
                    <div className="semester-icon">
                      <CalendarDaysIcon className="w-6 h-6 text-white" style={{ width: "24px", height: "24px" }} />
                    </div>
                    <div className="semester-info">
                      <h4>
                        Finished —{" "}
                        {state.startingSemester && state.startingSemester === state.currentSemester
                          ? state.currentSemester
                          : previousSemester(state.currentSemester)}
                      </h4>
                      <p>
                        {prevCourses.reduce((sum, c) => sum + getNumericCredits(c.credit_hours), 0)} credits •{" "}
                        {prevCourses.length} courses
                      </p>
                    </div>
                    <div className="semester-difficulty">Completed</div>
                  </div>
                  <div className="semester-courses">
                    {prevCourses.map((course) => {
                      const displayCredits = formatCredits(course.credit_hours);
                      const gpa = course.course_avg_gpa;
                      const hasValidGpa = gpa !== undefined && gpa !== null && Number(gpa) > 0;
                      let difficultyLabel = "Unknown";
                      let badgeClass = "badge-medium";
                      const diff = course.course_avg_difficulty;
                      if (diff !== undefined && diff !== null) {
                        if (diff <= 2.5) {
                          difficultyLabel = "Easy";
                          badgeClass = "badge-easy";
                        } else if (diff <= 3.5) {
                          difficultyLabel = "Medium";
                          badgeClass = "badge-medium";
                        } else {
                          difficultyLabel = "Hard";
                          badgeClass = "badge-hard";
                        }
                      }
                      return (
                        <div
                          key={course.course_id}
                          className="plan-course-card"
                          onClick={() => setSelectedCourse(course)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="course-card-top">
                            <span className="course-id">{course.course_id}</span>
                            {hasValidGpa ? (
                              <span className="gpa-badge">{Number(gpa).toFixed(2)} GPA</span>
                            ) : (
                              <span className="gpa-badge" style={{ background: "#9ca3af" }}>
                                Unknown GPA
                              </span>
                            )}
                          </div>
                          <h5 className="course-title">{course.title}</h5>
                          <div className="course-card-bottom">
                            <span className={`badge ${badgeClass}`}>{difficultyLabel}</span>
                            <span className="credits">{displayCredits} credits</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Current Semester */}
              {currCourses.length > 0 && (
                <div className="semester-card">
                  <div className="semester-header">
                    <div className="semester-icon">
                      <CalendarDaysIcon className="w-6 h-6 text-white" style={{ width: "24px", height: "24px" }} />
                    </div>
                    <div className="semester-info">
                      <h4>Current — {state.currentSemester}</h4>
                      <p>
                        {currCourses.reduce((sum, c) => sum + getNumericCredits(c.credit_hours), 0)} credits •{" "}
                        {currCourses.length} courses
                      </p>
                    </div>
                    <div className="semester-difficulty">In progress</div>
                  </div>
                  <div className="semester-courses">
                    {currCourses.map((course) => {
                      const displayCredits = formatCredits(course.credit_hours);
                      const gpa = course.course_avg_gpa;
                      const hasValidGpa = gpa !== undefined && gpa !== null && Number(gpa) > 0;
                      let difficultyLabel = "Unknown";
                      let badgeClass = "badge-medium";
                      const diff = course.course_avg_difficulty;
                      if (diff !== undefined && diff !== null) {
                        if (diff <= 2.5) {
                          difficultyLabel = "Easy";
                          badgeClass = "badge-easy";
                        } else if (diff <= 3.5) {
                          difficultyLabel = "Medium";
                          badgeClass = "badge-medium";
                        } else {
                          difficultyLabel = "Hard";
                          badgeClass = "badge-hard";
                        }
                      }
                      return (
                        <div
                          key={course.course_id}
                          className="plan-course-card"
                          onClick={() => setSelectedCourse(course)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="course-card-top">
                            <span className="course-id">{course.course_id}</span>
                            {hasValidGpa ? (
                              <span className="gpa-badge">{Number(gpa).toFixed(2)} GPA</span>
                            ) : (
                              <span className="gpa-badge" style={{ background: "#9ca3af" }}>
                                Unknown GPA
                              </span>
                            )}
                          </div>
                          <h5 className="course-title">{course.title}</h5>
                          <div className="course-card-bottom">
                            <span className={`badge ${badgeClass}`}>{difficultyLabel}</span>
                            <span className="credits">{displayCredits} credits</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {schedule.map((sem, idx) => {
                const avgDiff = calculateSemesterDifficulty(sem.courses);
                const diffClass = getSemesterDiffBadgeClass(avgDiff);

                return (
                  <div
                    key={idx}
                    className={`semester-card ${dragOverIndex === idx ? "drag-active" : ""}`}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                  >
                    <div className="semester-header">
                      <div className="semester-icon">
                        <CalendarDaysIcon className="w-6 h-6 text-white" style={{ width: "24px", height: "24px" }} />
                      </div>
                      <div className="semester-info">
                        <h4>{sem.name}</h4>
                        <p>
                          {sem.totalCredits} credits • {sem.courses.length} courses
                        </p>
                      </div>
                      <div className="semester-difficulty">
                        Avg Difficulty <span className={diffClass}>{avgDiff}</span>
                      </div>
                    </div>

                    <div className="semester-courses">
                      {sem.courses.map((course) => {
                        const displayCredits = formatCredits(course.credit_hours);
                        const gpa = course.course_avg_gpa;
                        const hasValidGpa = gpa !== undefined && gpa !== null && Number(gpa) > 0;
                        let difficultyLabel = "Unknown";
                        let badgeClass = "badge-medium";
                        const diff = course.course_avg_difficulty;
                        if (diff !== undefined && diff !== null) {
                          if (diff <= 2.5) {
                            difficultyLabel = "Easy";
                            badgeClass = "badge-easy";
                          } else if (diff <= 3.5) {
                            difficultyLabel = "Medium";
                            badgeClass = "badge-medium";
                          } else {
                            difficultyLabel = "Hard";
                            badgeClass = "badge-hard";
                          }
                        }

                        return (
                          <div
                            key={course.course_id}
                            className="plan-course-card"
                            onClick={() => setSelectedCourse(course)}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, course, idx)}
                            onDragEnd={handleDragEnd}
                            style={{ cursor: "grab" }}
                          >
                            <div className="course-card-top">
                              <span className="course-id">{course.course_id}</span>
                              {hasValidGpa ? (
                                <span className="gpa-badge">{Number(gpa).toFixed(2)} GPA</span>
                              ) : (
                                <span className="gpa-badge" style={{ background: "#9ca3af" }}>
                                  Unknown GPA
                                </span>
                              )}
                            </div>
                            <h5 className="course-title">{course.title}</h5>
                            <div className="course-card-bottom">
                              <span className={`badge ${badgeClass}`}>{difficultyLabel}</span>
                              <span className="credits">{displayCredits} credits</span>
                            </div>
                          </div>
                        );
                      })}
                      {/* Empty slot placeholder */}
                      <div
                        className="plan-course-card empty-slot"
                        onClick={() => handleAddElectiveClick(idx)}
                        style={{ cursor: "pointer" }}
                      >
                        <span>+ Add Elective</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Sidebar: Recommendations */}
        <aside className="dashboard-sidebar-right">
          <div className="dashboard-card params-card">
            <div className="card-header-row">
              <SparklesIcon
                className="w-6 h-6 text-orange-500"
                style={{ width: "24px", height: "24px", color: "#f97316" }}
              />
              <div>
                <h3 style={{ margin: 0 }}>Recommendations</h3>
                <p className="subtitle">Suggested for {currentCareerPathName}</p>
              </div>
            </div>
          </div>

          {/* List of draggable recommendations */}
          <div className="recommendation-list">
            {recommendations.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>
                No specific recommendations found.
              </div>
            ) : (
              recommendations.map((course, idx) => {
                let badgeClass = "badge-medium";
                let diffLabel = "Unknown";
                const diff = course.course_avg_difficulty;
                if (diff !== undefined && diff !== null) {
                  if (diff <= 2.5) {
                    diffLabel = "Easy";
                    badgeClass = "badge-easy";
                  } else if (diff <= 3.5) {
                    diffLabel = "Medium";
                    badgeClass = "badge-medium";
                  } else {
                    diffLabel = "Hard";
                    badgeClass = "badge-hard";
                  }
                }

                return (
                  <div
                    key={course.course_id}
                    className="rec-card"
                    onClick={() => setSelectedCourse(course)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="rec-badge">{idx + 1}</div>
                    <div className="rec-content">
                      <h4>{course.course_id}</h4>
                      <p>{course.title}</p>
                      <div className="rec-meta">
                        <span className={`badge ${badgeClass}`}>{diffLabel}</span>
                        <span>{getNumericCredits(course.credit_hours)} credits</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default GeneratePlan;
