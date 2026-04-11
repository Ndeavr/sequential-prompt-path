/**
 * UNPRO — Canonical URL Manager
 * Single source of truth for all canonical URL generation.
 * Rule: ALL indexable content canonicalizes to unpro.ca
 */

const ROOT_DOMAIN = "https://unpro.ca";

/** Paths that should NEVER be indexed (app/auth routes) */
const NOINDEX_PREFIXES = [
  "/login", "/signup", "/onboarding", "/dashboard", "/pro/", "/admin/",
  "/condos/dashboard", "/broker/", "/auth/", "/checkout/", "/booking/",
  "/settings/", "/profile/", "/notifications",
];

/** Normalize a path: remove trailing slash, strip query params */
function normalizePath(path: string): string {
  let clean = path.split("?")[0].split("#")[0];
  if (clean.length > 1 && clean.endsWith("/")) {
    clean = clean.slice(0, -1);
  }
  return clean;
}

/** Build the canonical URL for any given path */
export function getCanonicalUrl(path: string): string {
  return `${ROOT_DOMAIN}${normalizePath(path)}`;
}

/** Check if a path should be noindexed */
export function shouldNoindex(path: string): boolean {
  const normalized = normalizePath(path);
  return NOINDEX_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(prefix)
  );
}

/** Get the root domain */
export function getRootDomain(): string {
  return ROOT_DOMAIN;
}

/** Build a redirect URL from SEO page to app */
export function buildAppRedirectUrl(
  intent: string,
  city?: string,
  source?: string
): string {
  const params = new URLSearchParams({ intent });
  if (city) params.set("city", city);
  params.set("utm_source", source || "seo");
  params.set("utm_medium", "organic");
  // Phase 1: same domain. Phase 2: app.unpro.ca
  return `/onboarding?${params}`;
}

/** Canonical URL helpers for known page types */
export const canonicals = {
  home: () => ROOT_DOMAIN,
  service: (service: string, city: string) =>
    `${ROOT_DOMAIN}/services/${service}/${city}`,
  problem: (problem: string, city?: string) =>
    city ? `${ROOT_DOMAIN}/probleme/${problem}/${city}` : `${ROOT_DOMAIN}/probleme/${problem}`,
  renovation: (type: string, city: string) =>
    `${ROOT_DOMAIN}/renovation/${type}/${city}`,
  profession: (slug: string) => `${ROOT_DOMAIN}/profession/${slug}`,
  city: (slug: string) => `${ROOT_DOMAIN}/ville/${slug}`,
  blog: (slug: string) => `${ROOT_DOMAIN}/blog/${slug}`,
  guide: (slug: string) => `${ROOT_DOMAIN}/guides/${slug}`,
  seoPage: (slug: string) => `${ROOT_DOMAIN}/s/${slug}`,
  verification: (trade: string, city: string) =>
    `${ROOT_DOMAIN}/verifier-${trade}/${city}`,
};
