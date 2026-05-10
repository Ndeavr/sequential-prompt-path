import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultRedirectForRole, saveAuthIntent } from "@/services/auth/authIntentService";
import { saveReturnPath } from "@/lib/authReturn";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { validateAdmin, ADMIN_EMAILS, isAdminCached } from "@/lib/adminGuard";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  anyRole?: boolean;
}

type AdminCheck =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "allowed" }
  | { status: "denied"; reason: "no_role" | "load_error"; detail?: string };

const ProtectedRoute = ({ children, requiredRole, anyRole }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, role, roles, isAdmin, user } =
    useAuth() as any;
  const location = useLocation();
  const [adminCheck, setAdminCheck] = useState<AdminCheck>({ status: "idle" });

  const isAdminRoute = requiredRole === "admin";
  const userEmail = user?.email?.toLowerCase().trim() ?? null;
  const knownAdmin =
    isAuthenticated &&
    (isAdmin ||
      (Array.isArray(roles) && roles.includes("admin")) ||
      (!!userEmail && ADMIN_EMAILS.includes(userEmail)) ||
      (!!user?.id && isAdminCached(user.id)));

  useEffect(() => {
    if (!isAdminRoute) {
      setAdminCheck({ status: "idle" });
      return;
    }
    if (knownAdmin) {
      setAdminCheck({ status: "allowed" });
      return;
    }
    if (!isAuthenticated || !user?.id) {
      setAdminCheck({ status: "idle" });
      return;
    }

    let cancelled = false;
    setAdminCheck({ status: "checking" });

    (async () => {
      const result = await validateAdmin(user.id, user.email ?? null);
      if (cancelled) return;
      if (result.allowed) {
        setAdminCheck({ status: "allowed" });
      } else {
        const r = result as Extract<typeof result, { allowed: false }>;
        setAdminCheck({ status: "denied", reason: r.reason, detail: r.detail });
      }
    })();

    return () => { cancelled = true; };
  }, [isAdminRoute, knownAdmin, isAuthenticated, user?.id, user?.email]);


  // ── ADMIN PATH ─────────────────────────────────────────────
  if (isAdminRoute) {
    // Auth not resolved yet
    if (isLoading && !isAuthenticated) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-muted-foreground text-sm">Chargement…</p>
        </div>
      );
    }
    if (!isAuthenticated) {
      const fullPath = location.pathname + location.search + location.hash;
      saveAuthIntent({ returnPath: fullPath, action: "access_protected", roleHint: "admin" });
      saveReturnPath(fullPath, "admin");
      return <Navigate to="/login" replace />;
    }
    if (knownAdmin || adminCheck.status === "allowed") return <>{children}</>;
    if (adminCheck.status === "checking" || adminCheck.status === "idle") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-muted-foreground text-sm">Validation de l'accès administrateur…</p>
        </div>
      );
    }
    return <AdminAccessDenied reason={adminCheck.reason} detail={adminCheck.detail} />;
  }

  // ── NON-ADMIN PATH ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Chargement…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const fullPath = location.pathname + location.search + location.hash;
    saveAuthIntent({ returnPath: fullPath, action: "access_protected", roleHint: requiredRole });
    saveReturnPath(fullPath, "protected_route");
    return <Navigate to="/login" replace />;
  }

  // Admin bypasses every requiredRole.
  if (isAdmin || (Array.isArray(roles) && roles.includes("admin"))) {
    return <>{children}</>;
  }

  if (!anyRole && requiredRole && role !== requiredRole) {
    return <Navigate to={getDefaultRedirectForRole(role)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
