/**
 * UNPRO — Role Guard: Restricts access by role
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultRedirectForRole } from "@/services/auth/authIntentService";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Chargement…</div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Admin can access everything
  if (role === "admin") return <>{children}</>;

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultRedirectForRole(role)} replace />;
  }

  return <>{children}</>;
}
