import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getDefaultRedirectForRole, saveAuthIntent } from "@/services/auth/authIntentService";
import { saveReturnPath } from "@/lib/authReturn";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";

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
  const knownAdmin =
    isAuthenticated && (isAdmin || (Array.isArray(roles) && roles.includes("admin")));

  useEffect(() => {
    if (!isAdminRoute) {
      setAdminCheck({ status: "idle" });
      return;
    }
    if (knownAdmin) {
      setAdminCheck({ status: "allowed" });
      return;
    }
    // No session yet → wait for auth, don't query
    if (!isAuthenticated) {
      setAdminCheck({ status: "idle" });
      return;
    }

    let cancelled = false;
    setAdminCheck({ status: "checking" });

    const check = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = user?.id ?? sessionData.session?.user?.id;
        if (!userId) {
          if (!cancelled) setAdminCheck({ status: "denied", reason: "no_role" });
          return;
        }
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        if (cancelled) return;
        if (error) {
          setAdminCheck({ status: "denied", reason: "load_error", detail: error.message });
          return;
        }
        const isAdminRow = (data ?? []).some((r: any) => r.role === "admin");
        setAdminCheck(
          isAdminRow ? { status: "allowed" } : { status: "denied", reason: "no_role" },
        );
      } catch (e: any) {
        if (!cancelled) setAdminCheck({ status: "denied", reason: "load_error", detail: String(e?.message ?? e) });
      }
    };

    check();
    // Hard safety: never stay in "checking" forever
    const t = setTimeout(() => {
      if (!cancelled)
        setAdminCheck((prev) =>
          prev.status === "checking" ? { status: "denied", reason: "load_error", detail: "timeout" } : prev,
        );
    }, 3500);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isAdminRoute, knownAdmin, isAuthenticated, user?.id]);

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
