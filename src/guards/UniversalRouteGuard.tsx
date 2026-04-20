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
import RouteTransitionLoader from "@/components/navigation/RouteTransitionLoader";
import { useEffect, useRef } from "react";

interface UniversalRouteGuardProps {
  children: React.ReactNode;
  /** Override: specific roles allowed (takes precedence over registry) */
  allowedRoles?: string[];
  /** If true, any authenticated user can access */
  anyAuth?: boolean;
}

export default function UniversalRouteGuard({ children, allowedRoles, anyAuth }: UniversalRouteGuardProps) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();
  const tracked = useRef(false);

  // Track navigation
  useEffect(() => {
    if (!tracked.current && !isLoading) {
      trackNavigation(document.referrer || "/", location.pathname, "guard");
      tracked.current = true;
    }
  }, [isLoading, location.pathname]);

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
  if (role === "admin") return <>{children}</>;

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
