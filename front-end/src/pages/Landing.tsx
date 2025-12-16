import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  const goToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="login-page">
      {/* background circles */}
      <div className="login-circle login-circle--left" />
      <div className="login-circle login-circle--right" />

      <div className="login-card">
        <div className="login-icon login-icon--soft">
          {/* top logo inside orange rounded square */}
          <img
            src="/uiuc-planner-icon.svg"
            alt="UIUC Icon"
            style={{ width: "42px", height: "42px" }}
          />
        </div>

        <h1 className="login-title">UIUC Semester Planner</h1>
        <p className="login-subtitle">Plan Your Academic Journey</p>

        <button className="landing-main-button" onClick={goToLogin}>
        Get Started!
        </button>

        <p className="login-university">
          University of Illinois at Urbana-Champaign
        </p>

        <p className="login-tagline">
          Organize your courses, track your progress, plan your future
        </p>
      </div>
    </div>
  );
};

export default Landing;


