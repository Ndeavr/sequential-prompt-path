/**
 * UNPRO — Universal Route Guard
 * Replaces fragmented ProtectedRoute / AuthGuard / RoleGuard with a single,
 * centralized guard that uses the route registry for access decisions.
 *
 * Features:
 * - Saves navigation context before auth redirects
 * - Redirects to correct role dashboard on mismatch
 * - Admin bypasses all restrictions
 * - Elegant loading state
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { hasRouteAccess, resolveDestinationForRole } from "@/config/routeRegistry";
import { saveNavigationContext, trackNavigation } from "@/services/navigation/journeyService";
import { getDefaultRedirectForRole, saveAuthIntent } from "@/services/auth/authIntentService";
import { saveReturnPath } from "@/lib/authReturn";
import RouteTransitionLoader from "@/components/navigation/RouteTransitionLoader";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";

interface UniversalRouteGuardProps {
  children: React.ReactNode;
  /** Override: specific roles allowed (takes precedence over registry) */
  allowedRoles?: string[];
  /** If true, any authenticated user can access */
  anyAuth?: boolean;
}

export default function UniversalRouteGuard({ children, allowedRoles, anyAuth }: UniversalRouteGuardProps) {
  const { isAuthenticated, isLoading, role, roles, isAdmin, user, roleError, roleTimedOut } = useAuth() as any;
  const location = useLocation();
  const tracked = useRef(false);

  const isAdminGate = !!allowedRoles && allowedRoles.length === 1 && allowedRoles[0] === "admin";
  const knownAdmin = isAuthenticated && (isAdmin || (Array.isArray(roles) && roles.includes("admin")));
  const [adminCheck, setAdminCheck] = useState<
    | { status: "idle" | "checking" | "allowed" }
    | { status: "denied"; reason: "no_role" | "load_error"; detail?: string }
  >({ status: "idle" });

  useEffect(() => {
    if (!tracked.current && !isLoading) {
      trackNavigation(document.referrer || "/", location.pathname, "guard");
      tracked.current = true;
    }
  }, [isLoading, location.pathname]);

  useEffect(() => {
    if (!isAdminGate) return;
    if (knownAdmin) {
      setAdminCheck({ status: "allowed" });
      return;
    }
    if (!isAuthenticated) {
      setAdminCheck({ status: "idle" });
      return;
    }
    let cancelled = false;
    setAdminCheck({ status: "checking" });
    (async () => {
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
        const ok = (data ?? []).some((r: any) => r.role === "admin");
        setAdminCheck(ok ? { status: "allowed" } : { status: "denied", reason: "no_role" });
      } catch (e: any) {
        if (!cancelled) setAdminCheck({ status: "denied", reason: "load_error", detail: String(e?.message ?? e) });
      }
    })();
    const t = setTimeout(() => {
      if (!cancelled)
        setAdminCheck((p) =>
          p.status === "checking" ? { status: "denied", reason: "load_error", detail: "timeout" } : p,
        );
    }, 6000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [isAdminGate, knownAdmin, isAuthenticated, user?.id]);

  // ── Admin gate fast path
  if (isAdminGate) {
    if (isLoading && !isAuthenticated) return <RouteTransitionLoader />;
    if (!isAuthenticated) {
      const fullPath = location.pathname + location.search + location.hash;
      saveAuthIntent({ returnPath: fullPath, action: "access_protected", roleHint: "admin" });
      saveReturnPath(fullPath, "admin");
      return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }
    if (knownAdmin || adminCheck.status === "allowed") return <>{children}</>;
    if (adminCheck.status === "checking" || adminCheck.status === "idle") return <RouteTransitionLoader />;
    if (adminCheck.status === "denied") {
      return <AdminAccessDenied reason={adminCheck.reason} detail={adminCheck.detail} />;
    }
    return <RouteTransitionLoader />;
  }

  if (isLoading) {
    return <RouteTransitionLoader />;
  }

  // ── Auth check ──
  if (!isAuthenticated) {
    const fullPath = location.pathname + location.search + location.hash;
    saveAuthIntent({
      returnPath: fullPath,
      action: "access_protected",
      roleHint: allowedRoles?.[0],
    });
    saveReturnPath(fullPath, allowedRoles?.[0] === "admin" ? "admin" : "protected_route");
    saveNavigationContext({
      currentPath: location.pathname,
      previousPath: null,
      intendedDestination: fullPath,
      intendedRole: allowedRoles?.[0] || null,
      sourceCta: null,
      sourcePage: null,
      entryPageType: "protected",
      authRequired: true,
    });
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // ── Any authenticated user OK ──
  if (anyAuth) return <>{children}</>;

  // ── Admin bypass ──
  if (role === "admin" || (Array.isArray(roles) && roles.includes("admin"))) return <>{children}</>;

  // ── Recovery access ──
  if (location.pathname === "/admin/sms-debug" && isAuthenticated && !role && (roleError || roleTimedOut)) {
    return <>{children}</>;
  }

  // ── Explicit allowedRoles prop ──
  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      return <Navigate to={getDefaultRedirectForRole(role)} replace />;
    }
    return <>{children}</>;
  }

  // ── Registry-based access check ──
  const access = hasRouteAccess(location.pathname, role, isAuthenticated);
  if (!access.allowed) {
    if (access.reason === "role_mismatch") {
      return <Navigate to={access.fallback || getDefaultRedirectForRole(role)} replace />;
    }
    return <Navigate to={access.fallback || "/"} replace />;
  }

  return <>{children}</>;
}
