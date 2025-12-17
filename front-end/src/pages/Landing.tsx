import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center">
      <div className="relative w-full max-w-4xl px-6">
        <div className="absolute inset-0 -z-10 blur-3xl opacity-60" />

        <div className="rounded-2xl bg-white/80 backdrop-blur-md shadow-xl ring-1 ring-black/5 overflow-hidden">
          <div className="px-8 py-10 sm:px-12 sm:py-14">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm">
                <img src="/uiuc-planner-icon.svg" alt="UIUC Icon" className="h-7 w-7" />
              </div>
              <span className="text-sm font-medium text-slate-500">University of Illinois</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              UIUC Semester Planner
            </h1>
            <p className="mt-3 text-slate-600 text-base sm:text-lg max-w-2xl">
              Plan your academic journey, visualize your path to graduation, and tailor your courses to your career goals.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-3 text-white font-semibold shadow-sm hover:bg-brand-600 transition"
              >
                Get Started
              </button>
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-slate-900 font-semibold ring-1 ring-slate-200 hover:bg-slate-50 transition"
              >
                Sign in with Illinois
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-600">
              <div className="rounded-lg bg-white ring-1 ring-slate-200 p-4">
                Create personalized multi-semester plans
              </div>
              <div className="rounded-lg bg-white ring-1 ring-slate-200 p-4">
                Drag-and-drop courses with credit caps
              </div>
              <div className="rounded-lg bg-white ring-1 ring-slate-200 p-4">
                Career-path recommendations powered by data
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;


