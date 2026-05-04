/**
 * UNPRO — Dashboard Redirect Handler
 * Redirects authenticated users to their role-specific dashboard.
 * Uses journey snapshots for continuity, then falls back to role-based routing.
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultRedirectForRole } from "@/services/auth/authIntentService";
import { getResumePath } from "@/services/navigation/journeyService";
import { consumeAuthIntent } from "@/services/auth/authIntentService";
import RouteTransitionLoader from "@/components/navigation/RouteTransitionLoader";

export default function DashboardRedirectHandler() {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) return <RouteTransitionLoader />;
  if (!isAuthenticated) {
    console.warn("[DashboardRedirect] not authenticated → /login");
    return <Navigate to="/login" replace />;
  }

  // Priority: 1) auth intent (resume previous route), 2) journey snapshot, 3) role default
  const intent = consumeAuthIntent();
  if (intent?.returnPath && intent.returnPath !== "/dashboard") {
    console.log("[DashboardRedirect] resume intent →", intent.returnPath);
    return <Navigate to={intent.returnPath} replace />;
  }

  const resumePath = getResumePath(role);
  if (resumePath) {
    console.log("[DashboardRedirect] resume journey →", resumePath);
    return <Navigate to={resumePath} replace />;
  }

  const target = getDefaultRedirectForRole(role);
  console.log("[DashboardRedirect] default for role", role, "→", target);
  return <Navigate to={target} replace />;
}
