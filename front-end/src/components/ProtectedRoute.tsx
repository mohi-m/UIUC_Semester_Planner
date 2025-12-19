// src/components/ProtectedRoute.tsx
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-600">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="#e5e7eb" strokeWidth="4" />
            <path d="M22 12a10 10 0 0 1-10 10" fill="none" stroke="#f97316" strokeWidth="4" />
          </svg>
          Loading
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
