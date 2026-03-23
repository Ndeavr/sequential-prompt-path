/**
 * UNPRO — Auth Guard: Redirects unauthenticated users to /login
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { saveAuthIntent } from "@/services/auth/authIntentService";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Chargement…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    saveAuthIntent({
      returnPath: location.pathname + location.search,
      action: "access_protected",
    });
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
