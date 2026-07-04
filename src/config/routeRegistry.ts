/**
 * routeRegistry — single source of truth for legacy URL redirects,
 * role-based destinations, and shipped-route access checks.
 */

// ─────────────────────────────────────────────────────────────────────
// Legacy redirects — new "coming soon" nav slugs go here (never in nav
// components) so no visitor can reach the fallback template via our links.
// ─────────────────────────────────────────────────────────────────────
export const LEGACY_REDIRECTS: Record<string, string> = {
  "/home": "/",
  "/matches": "/recommendations",
  "/coming-soon": "/",
  "/test": "/",
  "/demo": "/",
  "/v2": "/",
  "/v3": "/",
  "/conversation": "/alex",
  "/homeowner": "/",
  "/contractor": "/entrepreneurs",
  "/professional": "/entrepreneurs",
};

// Any unknown path matching this pattern gets bounced to `/` by the fallback
// route. Prevents test/demo slugs from ever rendering the SEO landing template.
export const PLACEHOLDER_PATH_RE =
  /(^|\/)(test|demo|scratch|coming-soon|placeholder|sandbox|preview)(\/|$)/i;

/**
 * Paths that render a real, shipped page today. Kept small on purpose —
 * used by the fallback route to decide whether an unknown path was a nav
 * item we forgot to build (→ redirect to `/`) or an SEO/marketing slug
 * that legitimately renders the branded landing template.
 */
export const SHIPPED_NAV_ROUTES: ReadonlySet<string> = new Set([
  "/",
  "/index",
  "/alex",
  "/contractors",
  "/project/new",
  "/onboarding",
  "/waiting",
  "/dashboard",
  "/pro",
  "/admin",
  "/profile",
  "/leads",
  "/agenda",
]);

export function isShippedNav(pathname: string): boolean {
  return SHIPPED_NAV_ROUTES.has(pathname);
}

// ─────────────────────────────────────────────────────────────────────
// Role helpers used by guards, banners, and the journey tracker.
// ─────────────────────────────────────────────────────────────────────
export type UserRoleLike = string | null | undefined;

export function resolveDestinationForRole(role: UserRoleLike): string {
  switch (role) {
    case "contractor":
      return "/pro";
    case "admin":
      return "/admin";
    case "condo_manager":
    case "manager":
      return "/condo";
    case "homeowner":
      return "/dashboard";
    default:
      return "/";
  }
}

export function getJourneyTypeForRole(role: UserRoleLike): string {
  switch (role) {
    case "contractor":
      return "contractor";
    case "admin":
      return "admin";
    case "condo_manager":
    case "manager":
      return "condo_manager";
    case "homeowner":
      return "homeowner";
    default:
      return "guest";
  }
}

export interface RouteAccessResult {
  allowed: boolean;
  reason?: "auth_required" | "role_mismatch" | "not_found";
  fallback?: string;
}

// Prefix rules — kept intentionally permissive. Real granular access
// remains inside <ProtectedRoute> per-route. This registry only prevents
// obvious cross-role access (e.g. anon hitting /admin).
const ROLE_PREFIX_RULES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/pro", roles: ["contractor", "admin"] },
  { prefix: "/condo", roles: ["condo_manager", "manager", "admin"] },
];

export function hasRouteAccess(
  pathname: string,
  role: UserRoleLike,
  isAuthenticated: boolean,
): RouteAccessResult {
  for (const rule of ROLE_PREFIX_RULES) {
    if (pathname.startsWith(rule.prefix)) {
      if (!isAuthenticated) {
        return { allowed: false, reason: "auth_required", fallback: "/login" };
      }
      if (!role || !rule.roles.includes(role)) {
        return {
          allowed: false,
          reason: "role_mismatch",
          fallback: resolveDestinationForRole(role),
        };
      }
      return { allowed: true };
    }
  }
  return { allowed: true };
}
