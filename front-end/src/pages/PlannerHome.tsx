// src/pages/PlannerHome.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { fetchPathways, type CareerPath } from "../services/pathwayService";
import { searchCourses, type Course } from "../services/courseService";

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

  // Fetch pathways when step becomes 2 (or on mount if you prefer, but let's do lazy load or on mount)
  useEffect(() => {
    // Only fetch if we haven't already
    if (pathways.length === 0) {
      fetchPathways().then((data) => {
        setPathways(data);
      });
    }
  }, []);

  // ----- Step 3 state -----
  const [startingSemester, setStartingSemester] = useState(incomingState?.startingSemester || "");
  const [currentSemester, setCurrentSemester] = useState(incomingState?.currentSemester || "");
  // Separate previous and current term course selections
  const [prevSelectedCourses, setPrevSelectedCourses] = useState<Course[]>(incomingState?.completedPrevCourses || []);
  const [currSelectedCourses, setCurrSelectedCourses] = useState<Course[]>(incomingState?.currentTermCourses || []);
  const [addTarget, setAddTarget] = useState<"previous" | "current">("current");

  // Search state
  const [courseSearch, setCourseSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Course[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
    // Prevent duplicates across both buckets
    const inPrev = prevSelectedCourses.some((c) => c.course_id === course.course_id);
    const inCurr = currSelectedCourses.some((c) => c.course_id === course.course_id);
    if (inPrev || inCurr) {
      setCourseSearch("");
      setSearchResults([]);
      return;
    }

    if (addTarget === "previous") {
      setPrevSelectedCourses((prev) => [...prev, course]);
    } else {
      setCurrSelectedCourses((prev) => [...prev, course]);
    }
    setCourseSearch("");
    setSearchResults([]);
  };

  const removeCourse = (courseId: string, bucket: "previous" | "current") => {
    if (bucket === "previous") {
      setPrevSelectedCourses((prev) => prev.filter((c) => c.course_id !== courseId));
    } else {
      setCurrSelectedCourses((prev) => prev.filter((c) => c.course_id !== courseId));
    }
  };

  const handleGeneratePlan = () => {
    const selectedPath = pathways.find((p) => p.id === selectedCareer);
    navigate("/generate-plan", {
      state: {
        major: selectedMajor,
        careerPathId: selectedCareer,
        careerPathName: selectedPath ? selectedPath.label : "Career Path",
        // Back-compat aggregate (was previously just completed courses)
        selectedCourses: [...prevSelectedCourses, ...currSelectedCourses],
        completedPrevCourses: prevSelectedCourses,
        currentTermCourses: currSelectedCourses,
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
          <select className="wizard-select" value={selectedMajor} onChange={(e) => setSelectedMajor(e.target.value)}>
            <option value="" disabled>
              Choose your major...
            </option>
            {majors.map((major) => (
              <option key={major} value={major}>
                {major}
              </option>
            ))}
          </select>
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
    const finishedLabel =
      startingSemester && startingSemester === currentSemester
        ? currentSemester
        : previousSemester(currentSemester) || "Previous Semester";
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
              <select
                className="wizard-select"
                value={startingSemester}
                onChange={(e) => setStartingSemester(e.target.value)}
              >
                <option value="" disabled>
                  Select starting semester...
                </option>
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Current semester */}
          <div className="wizard-field-group">
            <label className="wizard-field-label">Current Semester</label>
            <div className="wizard-select-wrapper wizard-select-wrapper--left">
              <select
                className="wizard-select"
                value={currentSemester}
                onChange={(e) => setCurrentSemester(e.target.value)}
              >
                <option value="" disabled>
                  Select current semester...
                </option>
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
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

          {/* Completed and Current courses */}
          <div className="wizard-field-group">
            <label className="wizard-field-label">Add Your Courses</label>

            {/* Previous semester chips */}
            <div className="wizard-selected-courses" style={{ marginBottom: "1rem" }}>
              <p className="wizard-selected-label">Finished – {finishedLabel}</p>
              <div className="wizard-chips">
                {prevSelectedCourses.length === 0 && (
                  <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>No courses added</span>
                )}
                {prevSelectedCourses.map((course) => (
                  <button
                    key={course.course_id}
                    type="button"
                    className="wizard-chip"
                    onClick={() => removeCourse(course.course_id, "previous")}
                  >
                    {course.course_id}
                    <span className="wizard-chip-remove">×</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Current semester chips */}
            <div className="wizard-selected-courses" style={{ marginBottom: "1.5rem" }}>
              <p className="wizard-selected-label">Current – {currentSemester || "Select current semester"}</p>
              <div className="wizard-chips">
                {currSelectedCourses.length === 0 && (
                  <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>No courses added</span>
                )}
                {currSelectedCourses.map((course) => (
                  <button
                    key={course.course_id}
                    type="button"
                    className="wizard-chip"
                    onClick={() => removeCourse(course.course_id, "current")}
                  >
                    {course.course_id}
                    <span className="wizard-chip-remove">×</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="wizard-course-search-wrapper" style={{ position: "relative" }}>
              {/* Add target selector (dropdown) */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
                <label className="wizard-field-label" style={{ margin: 0 }}>
                  Add to
                </label>
                <select
                  className="wizard-select"
                  value={addTarget}
                  onChange={(e) => setAddTarget(e.target.value as "previous" | "current")}
                  style={{ width: "auto", padding: "6px 8px" }}
                >
                  <option value="previous">Finished</option>
                  <option value="current">Current</option>
                </select>
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
                  const isAdded =
                    prevSelectedCourses.some((c) => c.course_id === course.course_id) ||
                    currSelectedCourses.some((c) => c.course_id === course.course_id);
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
                        <button className="btn-add-mini" style={{ padding: "2px 8px" }}>
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
