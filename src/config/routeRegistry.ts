/**
 * routeRegistry — single source of truth for legacy URL redirects.
 *
 * Every "coming soon" nav slug must live here (mapped to `/` or to the real
 * shipped page) so no visitor can ever reach the fallback template through a
 * link we control.
 */

export const LEGACY_REDIRECTS: Record<string, string> = {
  "/home": "/",
  "/matches": "/",
};

/**
 * Paths that render a real, shipped page today. Kept small on purpose —
 * this is used by the fallback route to decide whether an unknown path was
 * a nav item we forgot to build (→ redirect to `/`) or an SEO/marketing
 * slug that legitimately renders the branded landing template.
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
