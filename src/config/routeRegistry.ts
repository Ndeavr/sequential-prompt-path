/**
 * UNPRO — Centralized Route Registry
 * Single source of truth for all route access rules, journey types, and fallbacks.
 */

export type JourneyType = "homeowner" | "contractor" | "condo_manager" | "affiliate" | "admin" | "public" | "auth" | "seo";

export interface RouteEntry {
  path: string;
  allowedRoles: string[] | "public";
  journeyType: JourneyType;
  requiresAuth: boolean;
  fallbackRoute: string;
  /** If role mismatch, where to send them */
  mismatchStrategy: "role_redirect" | "role_selection" | "home";
}

/**
 * Route registry — defines access rules for every critical route group.
 * Public routes have allowedRoles: "public".
 */
export const ROUTE_REGISTRY: RouteEntry[] = [
  // ─── Public ───
  { path: "/", allowedRoles: "public", journeyType: "public", requiresAuth: false, fallbackRoute: "/", mismatchStrategy: "home" },
  { path: "/search", allowedRoles: "public", journeyType: "public", requiresAuth: false, fallbackRoute: "/", mismatchStrategy: "home" },
  { path: "/login", allowedRoles: "public", journeyType: "auth", requiresAuth: false, fallbackRoute: "/", mismatchStrategy: "home" },
  { path: "/signup", allowedRoles: "public", journeyType: "auth", requiresAuth: false, fallbackRoute: "/", mismatchStrategy: "home" },
  { path: "/onboarding", allowedRoles: "public", journeyType: "auth", requiresAuth: false, fallbackRoute: "/", mismatchStrategy: "home" },
  { path: "/entrepreneur", allowedRoles: "public", journeyType: "public", requiresAuth: false, fallbackRoute: "/", mismatchStrategy: "home" },
  { path: "/entrepreneurs", allowedRoles: "public", journeyType: "public", requiresAuth: false, fallbackRoute: "/", mismatchStrategy: "home" },
  { path: "/condo", allowedRoles: "public", journeyType: "public", requiresAuth: false, fallbackRoute: "/", mismatchStrategy: "home" },
  { path: "/condos", allowedRoles: "public", journeyType: "public", requiresAuth: false, fallbackRoute: "/", mismatchStrategy: "home" },
  { path: "/courtiers", allowedRoles: "public", journeyType: "public", requiresAuth: false, fallbackRoute: "/", mismatchStrategy: "home" },
  { path: "/pricing", allowedRoles: "public", journeyType: "public", requiresAuth: false, fallbackRoute: "/", mismatchStrategy: "home" },
  { path: "/blog", allowedRoles: "public", journeyType: "seo", requiresAuth: false, fallbackRoute: "/", mismatchStrategy: "home" },

  // ─── Homeowner Dashboard ───
  { path: "/dashboard", allowedRoles: ["homeowner", "admin"], journeyType: "homeowner", requiresAuth: true, fallbackRoute: "/", mismatchStrategy: "role_redirect" },

  // ─── Contractor Pro ───
  { path: "/pro", allowedRoles: ["contractor", "admin"], journeyType: "contractor", requiresAuth: true, fallbackRoute: "/entrepreneurs", mismatchStrategy: "role_redirect" },

  // ─── Admin ───
  { path: "/admin", allowedRoles: ["admin"], journeyType: "admin", requiresAuth: true, fallbackRoute: "/", mismatchStrategy: "role_redirect" },

  // ─── Condo Dashboard ───
  { path: "/condos/dashboard", allowedRoles: ["homeowner", "condo_manager", "admin"], journeyType: "condo_manager", requiresAuth: true, fallbackRoute: "/condo", mismatchStrategy: "role_redirect" },

  // ─── Broker ───
  { path: "/broker", allowedRoles: ["homeowner", "admin"], journeyType: "homeowner", requiresAuth: true, fallbackRoute: "/courtiers", mismatchStrategy: "role_redirect" },
];

/**
 * Find the best matching route entry for a given path.
 * Uses prefix matching — more specific paths match first.
 */
export function findRouteEntry(path: string): RouteEntry | null {
  // Sort by path length desc so more specific routes match first
  const sorted = [...ROUTE_REGISTRY].sort((a, b) => b.path.length - a.path.length);
  return sorted.find(entry => path === entry.path || path.startsWith(entry.path + "/")) ?? null;
}

/**
 * Check if a role has access to a route.
 */
export function hasRouteAccess(path: string, role: string | null, isAuthenticated: boolean): { allowed: boolean; reason?: string; fallback?: string } {
  const entry = findRouteEntry(path);

  // Unknown route — allow (will 404 naturally)
  if (!entry) return { allowed: true };

  // Public route
  if (entry.allowedRoles === "public") return { allowed: true };

  // Requires auth but not authenticated
  if (entry.requiresAuth && !isAuthenticated) {
    return { allowed: false, reason: "auth_required", fallback: "/login" };
  }

  // Admin can access everything
  if (role === "admin") return { allowed: true };

  // Role check
  if (!role || !entry.allowedRoles.includes(role)) {
    return { allowed: false, reason: "role_mismatch", fallback: entry.fallbackRoute };
  }

  return { allowed: true };
}

/**
 * Resolve the correct destination for a user based on role.
 * RULE: Never default to /dashboard as universal fallback.
 */
export function resolveDestinationForRole(role: string | null): string {
  switch (role) {
    case "admin": return "/admin";
    case "contractor": return "/pro";
    case "homeowner": return "/dashboard";
    case "condo_manager": return "/condos/dashboard";
    default: return "/";
  }
}

/**
 * Get the journey type for the user's role.
 */
export function getJourneyTypeForRole(role: string | null): JourneyType {
  switch (role) {
    case "admin": return "admin";
    case "contractor": return "contractor";
    case "homeowner": return "homeowner";
    case "condo_manager": return "condo_manager";
    default: return "public";
  }
}
