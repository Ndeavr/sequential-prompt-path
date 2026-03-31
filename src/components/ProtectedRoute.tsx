import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultRedirectForRole, saveAuthIntent } from "@/services/auth/authIntentService";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  anyRole?: boolean;
}

const ProtectedRoute = ({ children, requiredRole, anyRole }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve intent before redirecting to login
    saveAuthIntent({
      returnPath: location.pathname + location.search,
      action: "access_protected",
      roleHint: requiredRole,
    });
    return <Navigate to="/login" replace />;
  }

  // If anyRole is set, skip role check. Admins can access any route.
  if (!anyRole && requiredRole && role !== requiredRole && role !== "admin") {
    return <Navigate to={getDefaultRedirectForRole(role)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
