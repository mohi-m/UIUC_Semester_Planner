// src/pages/CareerStep.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Heroicons (solid white icons)
import {
  CodeBracketIcon,
  ChartBarIcon,
  CpuChipIcon,
  BriefcaseIcon,
  BeakerIcon,
  CircleStackIcon,
} from "@heroicons/react/24/solid";

// Career choices with Heroicons
const careerOptions = [
  {
    id: "software",
    label: "Software Engineer",
    color: "#2563eb",
    icon: CodeBracketIcon,
  },
  {
    id: "analyst",
    label: "Data Analyst",
    color: "#16a34a",
    icon: ChartBarIcon,
  },
  {
    id: "ml",
    label: "ML Engineer",
    color: "#a855f7",
    icon: CpuChipIcon,
  },
  {
    id: "pm",
    label: "Product Manager",
    color: "#f97316",
    icon: BriefcaseIcon,
  },
  {
    id: "researcher",
    label: "Researcher",
    color: "#ec4899",
    icon: BeakerIcon,
  },
  {
    id: "datasci",
    label: "Data Scientist",
    color: "#6366f1",
    icon: CircleStackIcon,
  },
];

const CareerStep: React.FC = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleBack = () => navigate(-1);

  const handleNext = () => {
    if (!selected) return;
    console.log("Selected career:", selected);
    // navigate("/step3");  <-- you'll add this later
  };

  return (
    <div className="wizard-page">
      {/* Stepper */}
      <div className="wizard-stepper">
        <div className="wizard-steps">
          <div className="wizard-step wizard-step--completed">1</div>
          <div className="wizard-step-line wizard-step-line--completed" />
          <div className="wizard-step wizard-step--active">2</div>
          <div className="wizard-step-line" />
          <div className="wizard-step">3</div>
        </div>
        <p className="wizard-step-label">Step 2 of 3</p>
      </div>

      {/* Card */}
      <div className="wizard-card">
        <div className="wizard-card-header">
          <div className="wizard-icon">
            <BriefcaseIcon style={{ color: "white", width: 32, height: 32 }} />
          </div>
          <div>
            <h1 className="wizard-title">Choose Your Career Path</h1>
            <p className="wizard-subtitle">What's your professional goal?</p>
          </div>
        </div>

        {/* Career cards */}
        <div className="wizard-body">
          <div className="career-grid">
            {careerOptions.map((opt) => {
              const IconComponent = opt.icon;

              return (
                <button
                  key={opt.id}
                  className={
                    "career-card" +
                    (selected === opt.id ? " career-card--selected" : "")
                  }
                  onClick={() => setSelected(opt.id)}
                >
                  <div
                    className="career-icon"
                    style={{ backgroundColor: opt.color }}
                  >
                    <IconComponent
                      style={{
                        width: 28,
                        height: 28,
                        color: "white",
                      }}
                    />
                  </div>

                  <div className="career-label">{opt.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="wizard-footer">
          <button className="wizard-back-button" onClick={handleBack}>
            <span className="wizard-back-arrow">‹</span> Back
          </button>
          <button
            className="wizard-next-button"
            disabled={!selected}
            onClick={handleNext}
          >
            Next <span className="wizard-next-arrow">›</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CareerStep;

