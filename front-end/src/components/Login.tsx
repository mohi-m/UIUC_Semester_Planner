import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";

const ILLINOIS_DOMAIN = "@illinois.edu";

const getAuthErrorMessage = (error: unknown): string => {
  const fallback = "Please enter a valid email and password.";

  if (!(error instanceof FirebaseError)) return fallback;

  switch (error.code) {
    case "auth/invalid-email":
      return "Please enter a valid Illinois email address.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account already exists for this email.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return fallback;
  }
};

// ---- Main Login Component ----
const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateIllinoisEmail = (value: string) =>
    value.toLowerCase().endsWith(ILLINOIS_DOMAIN);

  const finishAuth = () => {
    navigate("/planner");
  };

  const handleEmailLogin = async () => {
    setError(null);

    if (!validateIllinoisEmail(email)) {
      setError("Please use your @illinois.edu email to log in.");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      finishAuth();
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    setError(null);

    if (!validateIllinoisEmail(email)) {
      setError("Please use your @illinois.edu email to sign up.");
      return;
    }

    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);
      finishAuth();
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background circles */}
      <div className="login-circle login-circle--left" />
      <div className="login-circle login-circle--right" />

      <div className="login-card">
        <h1 className="login-title">Sign in with your Illinois email</h1>
        <p className="login-subtitle">
          Enter your Illinois email and password to continue.
        </p>

        {/* Email */}
        <div className="login-field-group">
          <label className="login-label">Illinois Email</label>
          <input
            type="email"
            placeholder=" netid@illinois.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
          />
        </div>

        {/* Password */}
        <div className="login-field-group">
          <label className="login-label">Password</label>
          <input
            type="password"
            placeholder=" Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
          />
        </div>

        {/* Error Message */}
        {error && <p className="login-error">{error}</p>}

        {/* Buttons */}
        <div className="login-email-buttons">
          <button
            type="button"
            className="login-secondary-button"
            onClick={handleEmailLogin}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
          <button
            type="button"
            className="login-outline-button"
            onClick={handleEmailSignUp}
            disabled={loading}
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;



