// src/pages/PlannerHome.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { fetchPathways, type CareerPath } from "../services/pathwayService";
import { searchCourses, type Course } from "../services/courseService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ----- Types -----
type Step = 1 | 2 | 3;

// ----- Static data -----
const majors = [
  "Computer Science",
  "Electrical Engineering",
  "Computer Engineering",
  "Mathematics",
  "Statistics",
  "Data Science",
  "Information Science",
];

const semesters = ["Spring 2024", "Fall 2024", "Spring 2025", "Fall 2025", "Spring 2026", "Fall 2026"];

const PlannerHome: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const incomingState = location.state as any; // Using any to avoid duplicating the interface for now

  // ----- Step control -----
  const [step, setStep] = useState<Step>(1);

  // ----- Step 1 state -----
  const [selectedMajor, setSelectedMajor] = useState(incomingState?.major || "");

  // ----- Step 2 state -----
  const [selectedCareer, setSelectedCareer] = useState<string | null>(incomingState?.careerPathId || null);
  const [pathways, setPathways] = useState<CareerPath[]>([]);
  const [isLoadingPathways, setIsLoadingPathways] = useState<boolean>(false);
  const coldStartTimer = useRef<number | null>(null);
  const [showColdStartHint, setShowColdStartHint] = useState<boolean>(false);

  // Fetch pathways when step becomes 2 (or on mount if you prefer, but let's do lazy load or on mount)
  useEffect(() => {
    // Only fetch if we haven't already
    if (pathways.length === 0) {
      setIsLoadingPathways(true);
      // After a short delay, show a hint about potential cold start
      coldStartTimer.current = window.setTimeout(() => setShowColdStartHint(true), 1200);
      fetchPathways()
        .then((data) => {
          setPathways(data);
        })
        .catch((err) => {
          console.error("Failed to load pathways:", err);
        })
        .finally(() => {
          setIsLoadingPathways(false);
          if (coldStartTimer.current) {
            clearTimeout(coldStartTimer.current);
            coldStartTimer.current = null;
          }
        });
    }
  }, []);

  // ----- Step 3 state -----
  const [startingSemester, setStartingSemester] = useState(incomingState?.startingSemester || "");
  const [currentSemester, setCurrentSemester] = useState(incomingState?.currentSemester || "");
  // Map of term -> courses for that term (enables multiple previous semesters)
  const [selectedByTerm, setSelectedByTerm] = useState<Record<string, Course[]>>({});
  // Which term to add new courses to
  const [addTargetTerm, setAddTargetTerm] = useState<string>("");

  // Search state
  const [courseSearch, setCourseSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Course[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Seed term map from incoming state (back-compat with previous design)
  useEffect(() => {
    const map: Record<string, Course[]> = {};
    if (incomingState?.currentSemester) {
      map[incomingState.currentSemester] = incomingState?.currentTermCourses || [];
      const prev = previousSemester(incomingState.currentSemester);
      if (prev) {
        map[prev] = incomingState?.completedPrevCourses || [];
      }
    }
    setSelectedByTerm(map);
  }, []);

  // Keep addTargetTerm in sync with chosen current semester
  useEffect(() => {
    if (currentSemester) setAddTargetTerm(currentSemester);
  }, [currentSemester]);

  // Ensure we have keys for all terms between start and current
  useEffect(() => {
    if (!startingSemester || !currentSemester) return;
    const terms = listTermsInclusive(startingSemester, currentSemester) || [];
    setSelectedByTerm((prev) => {
      const next: Record<string, Course[]> = { ...prev };
      for (const t of terms) if (!next[t]) next[t] = [];
      return next;
    });
  }, [startingSemester, currentSemester]);

  // Search Effect
  useEffect(() => {
    if (step !== 3) return;

    // Clear results if search is too short
    if (courseSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timerId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCourses(courseSearch, 5); // Fetch top 5 only
        setSearchResults(results);
      } catch (err) {
        console.error("Error searching courses:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300); // Debounce

    return () => clearTimeout(timerId);
  }, [step, courseSearch]);

  // ----- Handlers -----
  const goNextFromStep1 = () => {
    if (!selectedMajor) return;
    setStep(2);
  };

  const goNextFromStep2 = () => {
    if (!selectedCareer) return;
    setStep(3);
  };

  const goBack = () => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
  };

  const addCourse = (course: Course) => {
    if (!addTargetTerm) return;
    // Avoid duplicates across all terms
    const exists = Object.values(selectedByTerm).some((arr) => arr.some((c) => c.course_id === course.course_id));
    if (exists) {
      return;
    }
    setSelectedByTerm((prev) => {
      const next: Record<string, Course[]> = { ...prev };
      next[addTargetTerm] = [...(next[addTargetTerm] || []), course];
      return next;
    });
  };

  const removeCourse = (courseId: string, term: string) => {
    setSelectedByTerm((prev) => {
      const next = { ...prev } as Record<string, Course[]>;
      if (next[term]) next[term] = next[term].filter((c) => c.course_id !== courseId);
      return next;
    });
  };

  const handleGeneratePlan = () => {
    const selectedPath = pathways.find((p) => p.id === selectedCareer);
    const currentCourses = currentSemester ? selectedByTerm[currentSemester] || [] : [];
    const prevCourses = Object.entries(selectedByTerm)
      .filter(([term]) => term !== currentSemester)
      .flatMap(([, courses]) => courses);

    // Build a map of finished terms -> courses (exclude current term)
    const previousTermCourses: Record<string, Course[]> = Object.fromEntries(
      Object.entries(selectedByTerm).filter(([term]) => term !== currentSemester)
    );
    navigate("/generate-plan", {
      state: {
        major: selectedMajor,
        careerPathId: selectedCareer,
        careerPathName: selectedPath ? selectedPath.label : "Career Path",
        // Back-compat aggregate (previous design kept two buckets)
        selectedCourses: [...prevCourses, ...currentCourses],
        completedPrevCourses: prevCourses,
        currentTermCourses: currentCourses,
        previousTermCourses,
        startingSemester: startingSemester,
        currentSemester: currentSemester,
      },
    });
  };

  // ----- Render helpers -----
  const renderStepper = () => (
    <div className="wizard-stepper">
      <div className="wizard-steps">
        <div className={step === 1 ? "wizard-step wizard-step--active" : "wizard-step wizard-step--completed"}>1</div>
        <div className={step >= 2 ? "wizard-step-line wizard-step-line--active" : "wizard-step-line"} />
        <div
          className={
            step === 2
              ? "wizard-step wizard-step--active"
              : step > 2
              ? "wizard-step wizard-step--completed"
              : "wizard-step"
          }
        >
          2
        </div>
        <div className={step === 3 ? "wizard-step-line wizard-step-line--active" : "wizard-step-line"} />
        <div className={step === 3 ? "wizard-step wizard-step--active" : "wizard-step"}>3</div>
      </div>
      <p className="wizard-step-label">Step {step} of 3</p>
    </div>
  );

  const renderStep1 = () => (
    <>
      <div className="wizard-card-header">
        <div className="wizard-icon">
          <img src="/uiuc-planner-icon.svg" alt="UIUC icon" className="wizard-icon-img" />
        </div>
        <div>
          <h1 className="wizard-title">Select Your Major</h1>
          <p className="wizard-subtitle">What are you studying at UIUC?</p>
        </div>
      </div>

      <div className="wizard-body">
        <div className="wizard-select-wrapper">
          <Select value={selectedMajor} onValueChange={(v) => setSelectedMajor(v)}>
            <SelectTrigger className="wizard-select">
              <SelectValue placeholder="Choose your major..." />
            </SelectTrigger>
            <SelectContent>
              {majors.map((major) => (
                <SelectItem key={major} value={major}>
                  {major}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="wizard-footer">
        <button className="wizard-back-button" disabled>
          <span className="wizard-back-arrow">‹</span> Back
        </button>
        <button className="wizard-next-button" onClick={goNextFromStep1} disabled={!selectedMajor}>
          Next <span className="wizard-next-arrow">›</span>
        </button>
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      <div className="wizard-card-header">
        <div className="wizard-icon">
          <img src="/uiuc-planner-icon.svg" alt="Career icon" className="wizard-icon-img" />
        </div>
        <div>
          <h1 className="wizard-title">Choose Your Career Path</h1>
          <p className="wizard-subtitle">What&apos;s your professional goal?</p>
        </div>
      </div>

      <div className="wizard-body">
        {isLoadingPathways ? (
          <div className="wizard-loading">
            <div className="wizard-spinner" aria-label="Loading career paths" />
            <div className="wizard-loading-text">Loading career paths…</div>
            {showColdStartHint && (
              <div className="wizard-loading-hint">
                Note: The servers are hosted on free resources and might take ~30s to cold start.
              </div>
            )}
          </div>
        ) : (
          <div className="wizard-career-grid">
            {pathways.map((path) => {
              const isSelected = selectedCareer === path.id;
              return (
                <button
                  key={path.id}
                  type="button"
                  className={"wizard-career-card" + (isSelected ? " wizard-career-card--selected" : "")}
                  onClick={() => setSelectedCareer(path.id)}
                >
                  <div className="wizard-career-icon" style={{ backgroundColor: path.color }}>
                    <path.icon className="wizard-career-icon-img" />
                  </div>
                  <span className="wizard-career-label">{path.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="wizard-footer">
        <button className="wizard-back-button" onClick={goBack}>
          <span className="wizard-back-arrow">‹</span> Back
        </button>
        <button className="wizard-next-button" onClick={goNextFromStep2} disabled={!selectedCareer}>
          Next <span className="wizard-next-arrow">›</span>
        </button>
      </div>
    </>
  );

  const renderStep3 = () => {
    const termList = startingSemester && currentSemester ? listTermsInclusive(startingSemester, currentSemester) : [];
    return (
      <>
        <div className="wizard-card-header">
          <div className="wizard-icon">
            <img src="/uiuc-planner-icon.svg" alt="Book icon" className="wizard-icon-img" />
          </div>
          <div>
            <h1 className="wizard-title">Your Academic Progress</h1>
            <p className="wizard-subtitle">Tell us where you are in your journey</p>
          </div>
        </div>

        <div className="wizard-body">
          {/* Start semester */}
          <div className="wizard-field-group">
            <label className="wizard-field-label">Program Start Semester</label>
            <div className="wizard-select-wrapper wizard-select-wrapper--left">
              <Select value={startingSemester} onValueChange={(v) => setStartingSemester(v)}>
                <SelectTrigger className="wizard-select">
                  <SelectValue placeholder="Select starting semester..." />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((sem) => (
                    <SelectItem key={sem} value={sem}>
                      {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Current semester */}
          <div className="wizard-field-group">
            <label className="wizard-field-label">Current Semester</label>
            <div className="wizard-select-wrapper wizard-select-wrapper--left">
              <Select value={currentSemester} onValueChange={(v) => setCurrentSemester(v)}>
                <SelectTrigger className="wizard-select">
                  <SelectValue placeholder="Select current semester..." />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((sem) => (
                    <SelectItem key={sem} value={sem}>
                      {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Plan context summary */}
          {(startingSemester || currentSemester) && (
            <div className="wizard-field-group" style={{ marginTop: "-6px" }}>
              <div
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "10px 12px",
                  color: "#374151",
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <span>
                  <strong>Start:</strong> {startingSemester || "—"}
                </span>
                <span>
                  <strong>Current:</strong> {currentSemester || "—"}
                </span>
                <span>
                  <strong>Upcoming:</strong> {currentSemester ? nextSemester(currentSemester) || "—" : "—"}
                </span>
              </div>
            </div>
          )}

          {/* Terms and Courses */}
          <div className="wizard-field-group">
            <label className="wizard-field-label">Add Your Courses</label>

            {(!startingSemester || !currentSemester) && (
              <p style={{ color: "#6b7280", marginBottom: 12 }}>
                Select your start and current semester to organize courses by term.
              </p>
            )}

            {termList && termList.length > 0 && (
              <div style={{ display: "grid", gap: 16 }}>
                {termList.map((term) => {
                  const list = selectedByTerm[term] || [];
                  const isCurrent = term === currentSemester;
                  return (
                    <div key={term} className="wizard-selected-courses">
                      <p className="wizard-selected-label">
                        {isCurrent ? "Current – " : "Finished – "}
                        {term}
                      </p>
                      <div className="wizard-chips">
                        {list.length === 0 && (
                          <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>No courses added</span>
                        )}
                        {list.map((course) => (
                          <button
                            key={course.course_id}
                            type="button"
                            className="wizard-chip"
                            onClick={() => removeCourse(course.course_id, term)}
                          >
                            {course.course_id}
                            <span className="wizard-chip-remove">×</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Search Input */}
            <div className="wizard-course-search-wrapper" style={{ position: "relative" }}>
              {/* Add target selector (dropdown) */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
                <label className="wizard-field-label" style={{ margin: 0 }}>
                  Add to
                </label>
                <Select value={addTargetTerm} onValueChange={(v) => setAddTargetTerm(v)}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select term..." />
                  </SelectTrigger>
                  <SelectContent>
                    {termList?.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentSemester && (
                  <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                    Upcoming: {nextSemester(currentSemester) || "—"}
                  </span>
                )}
              </div>
              <input
                type="text"
                className="wizard-course-search"
                placeholder="Search to add courses (e.g. CS 124)..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
              />
              {/* Spinner */}
              {isSearching && (
                <div
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    fontSize: "0.875rem",
                  }}
                >
                  Searching...
                </div>
              )}
            </div>

            {/* Search Results Dropdown/List */}
            {courseSearch.length >= 2 && !isSearching && searchResults.length > 0 && (
              <div className="wizard-search-results">
                {searchResults.map((course) => {
                  const isAdded = Object.values(selectedByTerm).some((arr) =>
                    arr.some((c) => c.course_id === course.course_id)
                  );
                  return (
                    <div
                      key={course.course_id}
                      className={`wizard-search-result-item ${isAdded ? "disabled" : ""}`}
                      onClick={() => !isAdded && addCourse(course)}
                      style={{
                        padding: "10px 12px",
                        borderBottom: "1px solid #f3f4f6",
                        cursor: isAdded ? "default" : "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: "#fff",
                        opacity: isAdded ? 0.6 : 1,
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: "#111827", marginRight: "8px" }}>
                          {course.course_id}
                        </span>
                        <span style={{ color: "#6b7280", fontSize: "0.9em" }}>{course.title}</span>
                      </div>
                      {!isAdded && (
                        <button className="btn-add-mini" aria-label="Add course">
                          +
                        </button>
                      )}
                      {isAdded && <span style={{ color: "#10b981", fontSize: "0.8em", fontWeight: 600 }}>Added</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {!isSearching && courseSearch.length >= 2 && searchResults.length === 0 && (
              <div style={{ padding: "12px", color: "#6b7280", fontSize: "0.9rem", fontStyle: "italic" }}>
                No courses found.
              </div>
            )}
          </div>
        </div>

        <div className="wizard-footer">
          <button className="wizard-back-button" onClick={goBack}>
            <span className="wizard-back-arrow">‹</span> Back
          </button>
          <button
            className="wizard-next-button wizard-next-button--primary"
            onClick={handleGeneratePlan}
            disabled={!currentSemester || !startingSemester}
          >
            Generate My Plan <span className="wizard-next-arrow">✨</span>
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="wizard-page">
      {renderStepper()}

      <div className="wizard-card">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
};

export default PlannerHome;

// Helpers
function previousSemester(sem: string): string | null {
  const parts = sem.split(" ");
  if (parts.length !== 2) return null;
  const season = parts[0];
  const year = parseInt(parts[1]);
  if (isNaN(year)) return null;
  // Major semesters only: Spring <-> Fall
  if (season === "Spring") return `Fall ${year - 1}`;
  if (season === "Fall") return `Spring ${year}`;
  return null;
}

// Upcoming major semester (skips Summer):
function nextSemester(sem: string): string | null {
  const parts = sem.split(" ");
  if (parts.length !== 2) return null;
  const season = parts[0];
  const year = parseInt(parts[1]);
  if (isNaN(year)) return null;
  if (season === "Spring") return `Fall ${year}`;
  if (season === "Summer") return `Fall ${year}`; // Summer -> Fall of same year
  if (season === "Fall") return `Spring ${year + 1}`;
  return null;
}

// Inclusive list of major semesters from start -> end. Returns [] if invalid order.
function listTermsInclusive(start: string, end: string): string[] | null {
  if (!start || !end) return null;
  // Prevent infinite loop on bad data
  const guard = 20; // covers 10 academic years
  const out: string[] = [];
  let current = start;
  for (let i = 0; i < guard; i++) {
    out.push(current);
    if (current === end) return out;
    const nxt = nextSemester(current);
    if (!nxt) return null;
    current = nxt;
  }
  // If we exhausted the guard without reaching end, the input order is invalid
  return null;
}
