import React from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, GraduationCap, TrendingUp, ArrowRight, CheckCircle2 } from "lucide-react";

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-slate-50 flex items-center justify-center overflow-hidden selection:bg-[#FF5F05] selection:text-white">
      {/* Background Decor - UIUC Colors */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-[#13294B] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-[#FF5F05] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

      {/* Main Container */}
      <div className="relative w-full max-w-4xl px-6">
        <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left Content Section */}
            <div className="px-8 py-12 sm:px-12 sm:py-16 flex flex-col justify-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-50 border border-blue-100 w-fit mb-6">
                <img src="/UIUC_logo.png" alt="UIUC Logo" className="w-10 h-10 rounded-xl" />
                <span className="text-xs font-semibold text-[#13294B] uppercase tracking-wide">
                  UIUC Semester Planner
                </span>
              </div>

              {/* Headlines */}
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#13294B] mb-4">
                Master your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5F05] to-orange-600">
                  degree plan.
                </span>
              </h1>

              <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                Stop guessing. Visualize your path to graduation, track prerequisites, and align electives with your
                career goals.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#13294B] px-6 py-3.5 text-white font-semibold shadow-lg shadow-blue-900/20 hover:bg-[#1e3a66] hover:-translate-y-0.5 transition-all duration-200"
                >
                  Sign in with NetID
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Trust/Social Proof */}
              <div className="mt-8 pt-8 border-t border-slate-200 flex items-center gap-3 text-sm text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Optimized for CS Majors</span>
              </div>
            </div>

            {/* Right Feature Grid (Bento Style) */}
            <div className="bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-slate-100 p-8 sm:p-12 flex flex-col justify-center gap-6">
              <FeatureCard
                icon={<Calendar className="w-6 h-6 text-[#13294B]" />}
                title="Smart Scheduling"
                desc="Drag-and-drop courses with automatic credit cap checks."
              />

              <FeatureCard
                icon={<TrendingUp className="w-6 h-6 text-[#FF5F05]" />}
                title="Career Alignment"
                desc="Get course recommendations based on industry trends."
              />

              <FeatureCard
                icon={<GraduationCap className="w-6 h-6 text-blue-600" />}
                title="Graduation Tracker"
                desc="Visualize your progress across multiple semesters."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Component for the Feature Grid
type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  desc: string;
};

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, desc }) => (
  <div className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300">
    <div className="shrink-0 h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center">{icon}</div>
    <div>
      <h3 className="font-semibold text-[#13294B]">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 leading-snug">{desc}</p>
    </div>
  </div>
);

export default Landing;
