/**
 * UNPRO — Role Guard: Restricts access by role
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultRedirectForRole } from "@/services/auth/authIntentService";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const timedOut = useLoadingTimeout(isLoading, 6000, "role_guard");

  if (isLoading && !timedOut) {
    return <RouteSkeleton />;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Admin can access everything
  if (role === "admin") return <>{children}</>;

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultRedirectForRole(role)} replace />;
  }

  return <>{children}</>;
}
