/**
 * UNPRO — Dashboard Redirect Handler
 * Redirects authenticated users to their role-specific dashboard.
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultRedirectForRole } from "@/services/auth/authIntentService";

export default function DashboardRedirectHandler() {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Chargement…</div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Navigate to={getDefaultRedirectForRole(role)} replace />;
}
