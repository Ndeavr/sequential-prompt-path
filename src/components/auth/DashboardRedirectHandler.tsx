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
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Priority: 1) auth intent, 2) journey snapshot, 3) role default
  const intent = consumeAuthIntent();
  if (intent?.returnPath) return <Navigate to={intent.returnPath} replace />;

  const resumePath = getResumePath(role);
  if (resumePath) return <Navigate to={resumePath} replace />;

  return <Navigate to={getDefaultRedirectForRole(role)} replace />;
}
