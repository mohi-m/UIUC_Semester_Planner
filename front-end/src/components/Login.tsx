import React, { useState } from "react";
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
import { Mail, Lock, AlertCircle, Github, UserPlus, LogIn } from "lucide-react";

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const ILLINOIS_DOMAIN = "@illinois.edu";

const Login: React.FC = () => {
  const navigate = useNavigate();

  // 1. New State for Toggling Mode
  const [isSignUp, setIsSignUp] = useState<boolean>(false);

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>(""); // Optional: good for UX
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const validateIllinoisEmail = (value: string) => value.toLowerCase().endsWith(ILLINOIS_DOMAIN);

  // Unified Handler
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent form reload
    setError(null);

    // Basic Validation
    if (!validateIllinoisEmail(email)) {
      setError(`Please use your ${ILLINOIS_DOMAIN} email.`);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate("/planner");
    } catch (err: unknown) {
      const msg = (err as FirebaseError)?.message || "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Social sign-in handlers (use the imported providers)
  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigate("/planner");
    } catch (err: unknown) {
      setError((err as FirebaseError)?.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, new GithubAuthProvider());
      navigate("/planner");
    } catch (err: unknown) {
      setError((err as FirebaseError)?.message || "GitHub sign-in failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="relative min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-[#13294B] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-[#FF5F05] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />

      <div className="relative w-full max-w-md backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/50 p-8">
        <div className="text-center mb-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-50 border border-blue-100 w-fit mb-6">
            <img src="/UIUC_logo.png" alt="UIUC Logo" className="w-10 h-10 rounded-xl" />
            <span className="text-xs font-semibold text-[#13294B] uppercase tracking-wide">
              UIUC Semester Planner
            </span>
          </div>

          {/* Dynamic Header */}
          <h2 className="text-2xl font-bold text-[#13294B]">{isSignUp ? "Create Account" : "Welcome Back"}</h2>
          <p className="text-slate-500 mt-2 text-sm">
            {isSignUp ? "Start planning your semesters today" : "Sign in to access your semester plans"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative group">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-[#FF5F05] transition-colors" />
            <input
              type="email"
              placeholder="netID@illinois.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:border-[#FF5F05] focus:ring-2 focus:ring-orange-500/10 transition-all placeholder:text-slate-400 text-slate-700"
              required
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-[#FF5F05] transition-colors" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:border-[#FF5F05] focus:ring-2 focus:ring-orange-500/10 transition-all placeholder:text-slate-400 text-slate-700"
              required
            />
          </div>

          {/* Conditional Confirm Password Field */}
          {isSignUp && (
            <div className="relative group animate-in fade-in slide-in-from-top-2 duration-300">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-[#FF5F05] transition-colors" />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:border-[#FF5F05] focus:ring-2 focus:ring-orange-500/10 transition-all placeholder:text-slate-400 text-slate-700"
                required={isSignUp}
              />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3 text-sm text-red-600 animate-in slide-in-from-top-1">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#13294B] hover:bg-[#1e3a66] text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-70 mt-2"
          >
            {loading ? (
              "Processing..."
            ) : (
              <>
                <span>{isSignUp ? "Create Account" : "Sign In"}</span>
                {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode Button */}
        <div className="mt-6 text-center">
          <p className="text-slate-600 text-sm">
            {isSignUp ? "Already have an account?" : "Don't have an account yet?"}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null); // clear errors when switching
              }}
              className="ml-2 font-semibold text-[#FF5F05] hover:text-orange-700 hover:underline transition-all"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>

        {/* Divider & Socials */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white/80 backdrop-blur-sm px-2 text-slate-400 font-medium">Or continue with</span>
          </div>
        </div>

        {/* Social Buttons (Hidden logic for brevity, insert handlers here) */}
        <div className="grid grid-cols-2 gap-4">
          {/* Add your social buttons here as before */}
          {/* Example: */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 p-2.5 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-70"
          >
            <GoogleIcon /> <span className="text-sm font-medium text-slate-600">Google</span>
          </button>
          <button
            type="button"
            onClick={handleGithubLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 p-2.5 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-70"
          >
            <Github className="w-4 h-4" /> <span className="text-sm font-medium text-slate-600">GitHub</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
