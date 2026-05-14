import { ReactNode } from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  authed: boolean | null;
  children: ReactNode;
}

/**
 * ProtectedRoute — redirects to login if not authenticated.
 * `authed === null` means still checking — renders nothing (handled by parent).
 */
export function ProtectedRoute({ authed, children }: ProtectedRouteProps) {
  if (authed === false) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
