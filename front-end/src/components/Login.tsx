import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
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
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed before completing.";
    case "auth/cancelled-popup-request":
      return "Another sign-in attempt is in progress. Please try again.";
    case "auth/account-exists-with-different-credential":
      return "Account exists with a different sign-in method. Try another option.";
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

  const validateIllinoisEmail = (value: string) => value.toLowerCase().endsWith(ILLINOIS_DOMAIN);

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

  // OAuth: Google
  const handleGoogleLogin = async () => {
    setError(null);
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      // Optionally hint Google to use Illinois accounts
      provider.setCustomParameters({ hd: "illinois.edu" });
      await signInWithPopup(auth, provider);
      finishAuth();
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // OAuth: GitHub
  const handleGithubLogin = async () => {
    setError(null);
    try {
      setLoading(true);
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
      finishAuth();
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm">
            <img src="/uiuc-planner-icon.svg" alt="UIUC Icon" className="h-6 w-6" />
          </div>
          <div className="text-slate-700 font-semibold">UIUC Semester Planner</div>
        </div>

        <div className="rounded-2xl bg-white/90 backdrop-blur-md shadow-xl ring-1 ring-black/5 p-6">
          <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-600">Use your Illinois email or a provider below.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Illinois Email</label>
              <input
                type="email"
                placeholder="netid@illinois.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-white font-semibold shadow-sm hover:bg-brand-600 transition disabled:opacity-50"
                onClick={handleEmailLogin}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Login"}
              </button>
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-slate-900 font-semibold ring-1 ring-slate-200 hover:bg-slate-50 transition disabled:opacity-50"
                onClick={handleEmailSignUp}
                disabled={loading}
              >
                Create Account
              </button>
            </div>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-slate-500">or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-slate-900 font-semibold ring-1 ring-slate-200 hover:bg-slate-50 transition disabled:opacity-50"
                onClick={handleGoogleLogin}
                disabled={loading}
                aria-label="Continue with Google"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="h-4 w-4" />
                Google
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-slate-900 font-semibold ring-1 ring-slate-200 hover:bg-slate-50 transition disabled:opacity-50"
                onClick={handleGithubLogin}
                disabled={loading}
                aria-label="Continue with GitHub"
              >
                <img src="https://github.githubassets.com/favicons/favicon.png" alt="GitHub" className="h-4 w-4" />
                GitHub
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
