/**
 * UNPRO — Canonical URL Manager
 * Single source of truth for all canonical URL generation.
 * Rule: ALL indexable content canonicalizes to unpro.ca
 *
 * URL Formula (May 2026 blueprint):
 *   /{type}/{service-keyword}/{city}/{neighborhood-or-qualifier}
 */

const ROOT_DOMAIN = "https://unpro.ca";

/** Paths that should NEVER be indexed (app/auth routes) */
const NOINDEX_PREFIXES = [
  "/login", "/signup", "/onboarding", "/dashboard", "/pro/", "/admin/",
  "/condos/dashboard", "/broker/", "/auth/", "/checkout/", "/booking/",
  "/settings/", "/profile/", "/notifications",
];

function normalizePath(path: string): string {
  let clean = path.split("?")[0].split("#")[0];
  if (clean.length > 1 && clean.endsWith("/")) clean = clean.slice(0, -1);
  return clean.toLowerCase();
}

export function getCanonicalUrl(path: string): string {
  return `${ROOT_DOMAIN}${normalizePath(path)}`;
}

export function shouldNoindex(path: string): boolean {
  const normalized = normalizePath(path);
  return NOINDEX_PREFIXES.some((p) => normalized === p || normalized.startsWith(p));
}

export function getRootDomain(): string {
  return ROOT_DOMAIN;
}

export function buildAppRedirectUrl(intent: string, city?: string, source?: string): string {
  const params = new URLSearchParams({ intent });
  if (city) params.set("city", city);
  params.set("utm_source", source || "seo");
  params.set("utm_medium", "organic");
  return `/onboarding?${params}`;
}

/** Best-effort English ↔ French path mirror for hreflang */
export function getEnglishCounterpart(path: string): string {
  const p = normalizePath(path);
  if (p.startsWith("/en/")) return `${ROOT_DOMAIN}${p}`;
  // Map known FR roots → /en mirror
  const map: Record<string, string> = {
    "/solution/": "/en/solution/",
    "/contractor/": "/en/contractor/",
    "/guide/": "/en/guide/",
    "/project/": "/en/project/",
    "/services/": "/en/services/",
    "/probleme/": "/en/problem/",
    "/profession/": "/en/trade/",
    "/ville/": "/en/city/",
  };
  for (const [fr, en] of Object.entries(map)) {
    if (p.startsWith(fr)) return `${ROOT_DOMAIN}${p.replace(fr, en)}`;
  }
  return `${ROOT_DOMAIN}/en${p}`;
}

export function getFrenchCounterpart(path: string): string {
  const p = normalizePath(path);
  if (!p.startsWith("/en/")) return `${ROOT_DOMAIN}${p}`;
  return `${ROOT_DOMAIN}${p.replace(/^\/en/, "")}`;
}

/** Canonical URL helpers — blueprint formula */
export const canonicals = {
  home: () => ROOT_DOMAIN,

  // Blueprint canonical: /solution/{service}/{city}[/{neighborhood}]
  solution: (service: string, city?: string, neighborhood?: string) => {
    const parts = ["/solution", service, city, neighborhood].filter(Boolean);
    return `${ROOT_DOMAIN}${parts.join("/")}`;
  },
  contractor: (slug: string, city: string, sub?: "reviews" | "projects") =>
    `${ROOT_DOMAIN}/contractor/${slug}/${city}${sub ? `/${sub}` : ""}`,
  guide: (topic: string, city?: string) =>
    `${ROOT_DOMAIN}/guide/${topic}${city ? `/${city}` : ""}`,
  project: (slug: string) => `${ROOT_DOMAIN}/project/${slug}`,

  // Legacy (kept for backwards compat — existing pages still render)
  service: (service: string, city: string) => `${ROOT_DOMAIN}/services/${service}/${city}`,
  problem: (problem: string, city?: string) =>
    city ? `${ROOT_DOMAIN}/probleme/${problem}/${city}` : `${ROOT_DOMAIN}/probleme/${problem}`,
  renovation: (type: string, city: string) => `${ROOT_DOMAIN}/renovation/${type}/${city}`,
  profession: (slug: string) => `${ROOT_DOMAIN}/profession/${slug}`,
  city: (slug: string) => `${ROOT_DOMAIN}/ville/${slug}`,
  blog: (slug: string) => `${ROOT_DOMAIN}/blog/${slug}`,
  seoPage: (slug: string) => `${ROOT_DOMAIN}/s/${slug}`,
  verification: (trade: string, city: string) => `${ROOT_DOMAIN}/verifier-${trade}/${city}`,
};
