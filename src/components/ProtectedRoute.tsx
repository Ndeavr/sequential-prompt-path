import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getDefaultRedirectForRole, saveAuthIntent } from "@/services/auth/authIntentService";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  anyRole?: boolean;
}

const ProtectedRoute = ({ children, requiredRole, anyRole }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, isRoleLoading, role, roles, isAdmin, roleTimedOut, roleError, user } = useAuth() as any;
  const location = useLocation();
  const [adminFallback, setAdminFallback] = useState<"idle" | "checking" | "allowed" | "denied">("idle");

  useEffect(() => {
    if (requiredRole !== "admin" || !isAuthenticated || !user?.id) {
      setAdminFallback("idle");
      return;
    }

    if (isAdmin || (Array.isArray(roles) && roles.includes("admin"))) {
      setAdminFallback("allowed");
      return;
    }

    if (!roleTimedOut && !roleError) return;

    let cancelled = false;
    setAdminFallback("checking");
    (async () => {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin" as any)
          .maybeSingle();
        if (!cancelled) setAdminFallback(data?.role === "admin" ? "allowed" : "denied");
      } catch {
        if (!cancelled) setAdminFallback("denied");
      }
    })();

    return () => { cancelled = true; };
  }, [requiredRole, isAuthenticated, user?.id, isAdmin, Array.isArray(roles) ? roles.join(",") : "", roleTimedOut, roleError]);

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
  if (isAdmin || (Array.isArray(roles) && roles.includes("admin")) || adminFallback === "allowed") {
    return <>{children}</>;
  }

  // Don't bounce while the role query is still resolving — prevents loops.
  // Admin routes must not redirect on role timeout; validate once directly instead.
  if (isRoleLoading || role === undefined || (requiredRole === "admin" && adminFallback !== "denied" && (roleTimedOut || roleError || adminFallback === "checking"))) {
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
