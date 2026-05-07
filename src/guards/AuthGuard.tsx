/**
 * UNPRO — Auth Guard: Opens premium overlay for unauthenticated users
 * instead of hard-redirecting to /login.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { openAuthOverlay } from "@/hooks/useAuthOverlay";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";

interface AuthGuardProps {
  children: React.ReactNode;
  actionLabel?: string;
}

export default function AuthGuard({ children, actionLabel }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const timedOut = useLoadingTimeout(isLoading, 6000, "auth_guard");

  useEffect(() => {
    if ((!isLoading || timedOut) && !isAuthenticated) {
      openAuthOverlay({
        label: actionLabel ?? "Accéder à cette section",
        returnPath: location.pathname + location.search + location.hash,
        action: "access_protected",
      });
    }
  }, [isAuthenticated, isLoading, timedOut, location, actionLabel]);

  if (isLoading && !timedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Chargement…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Render nothing — overlay handles the auth UX
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Connexion requise</div>
      </div>
    );
  }

  return <>{children}</>;
}
