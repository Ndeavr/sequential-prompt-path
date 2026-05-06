import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultRedirectForRole, saveAuthIntent } from "@/services/auth/authIntentService";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  anyRole?: boolean;
}

const ProtectedRoute = ({ children, requiredRole, anyRole }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, isRoleLoading, role, roles, isAdmin } = useAuth() as any;
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    saveAuthIntent({
      returnPath: location.pathname + location.search + location.hash,
      action: "access_protected",
      roleHint: requiredRole,
    });
    return <Navigate to="/login" replace />;
  }

  // Admin bypasses every requiredRole. Check the full role list, not just primary.
  if (isAdmin || (Array.isArray(roles) && roles.includes("admin"))) {
    return <>{children}</>;
  }

  // Don't bounce while the role query is still resolving — prevents loops.
  if (isRoleLoading || role === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!anyRole && requiredRole && role !== requiredRole) {
    return <Navigate to={getDefaultRedirectForRole(role)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
