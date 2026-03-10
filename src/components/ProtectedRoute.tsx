import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  /** If true, allow any authenticated user regardless of role */
  anyRole?: boolean;
}

const ProtectedRoute = ({ children, requiredRole, anyRole }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If anyRole is set, skip role check
  if (!anyRole && requiredRole && role !== requiredRole) {
    // Redirect to role-appropriate dashboard
    if (role === "contractor") return <Navigate to="/pro" replace />;
    if (role === "admin") return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
