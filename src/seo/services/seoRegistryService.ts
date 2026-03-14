/**
 * UNPRO — SEO Registry Service
 * Manages page indexability, canonical URLs, and sitemap generation.
 */

import { SEO_CITIES } from "../data/cities";
import { SEO_SERVICES } from "../data/services";
import { SEO_PROBLEMS } from "../data/problems";
import { SEO_GUIDES } from "../data/guides";
import { SEO_RENOVATIONS } from "../data/renovations";

export type SeoPageType =
  | "house"
  | "city"
  | "neighborhood"
  | "street"
  | "contractor"
  | "problem"
  | "solution"
  | "profession"
  | "service_location"
  | "problem_location"
  | "guide"
  | "renovation_location";

export interface SeoPageEntry {
  type: SeoPageType;
  path: string;
  canonical: string;
  indexable: boolean;
  lastmod?: string;
  priority: number;
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
}

const BASE_URL = "https://unpro.ca";

/** Static pages always indexed */
const STATIC_PAGES: SeoPageEntry[] = [
  { type: "city", path: "/", canonical: `${BASE_URL}/`, indexable: true, priority: 1.0, changefreq: "daily" },
  { type: "city", path: "/services", canonical: `${BASE_URL}/services`, indexable: true, priority: 0.9, changefreq: "weekly" },
  { type: "city", path: "/search", canonical: `${BASE_URL}/search`, indexable: true, priority: 0.8, changefreq: "daily" },
  { type: "city", path: "/verifier-entrepreneur", canonical: `${BASE_URL}/verifier-entrepreneur`, indexable: true, priority: 0.7, changefreq: "monthly" },
  { type: "city", path: "/copropriete", canonical: `${BASE_URL}/copropriete`, indexable: true, priority: 0.7, changefreq: "monthly" },
  { type: "city", path: "/answers", canonical: `${BASE_URL}/answers`, indexable: true, priority: 0.7, changefreq: "weekly" },
];

/** Generate all city page entries */
export function getCityPageEntries(): SeoPageEntry[] {
  return SEO_CITIES.map((c) => ({
    type: "city" as SeoPageType,
    path: `/ville/${c.slug}`,
    canonical: `${BASE_URL}/ville/${c.slug}`,
    indexable: true,
    priority: 0.7,
    changefreq: "monthly" as const,
  }));
}

/** Generate problem page entries (DB-driven, always indexed) */
export function getProblemPageEntries(): SeoPageEntry[] {
  return SEO_PROBLEMS.map((p) => ({
    type: "problem" as SeoPageType,
    path: `/probleme/${p.slug}`,
    canonical: `${BASE_URL}/probleme/${p.slug}`,
    indexable: true,
    priority: 0.8,
    changefreq: "monthly" as const,
  }));
}

/** Generate solution page entries */
export function getSolutionPageEntries(): SeoPageEntry[] {
  // Solutions come from DB; use problems' related services as proxy
  return SEO_SERVICES.map((s) => ({
    type: "solution" as SeoPageType,
    path: `/solution/${s.slug}`,
    canonical: `${BASE_URL}/solution/${s.slug}`,
    indexable: true,
    priority: 0.7,
    changefreq: "monthly" as const,
  }));
}

/** Generate service+location entries */
export function getServiceLocationEntries(): SeoPageEntry[] {
  return SEO_SERVICES.flatMap((s) =>
    SEO_CITIES.map((c) => ({
      type: "service_location" as SeoPageType,
      path: `/services/${s.slug}/${c.slug}`,
      canonical: `${BASE_URL}/services/${s.slug}/${c.slug}`,
      indexable: true,
      priority: 0.6,
      changefreq: "monthly" as const,
    }))
  );
}

/** Generate problem+location entries */
export function getProblemLocationEntries(): SeoPageEntry[] {
  return SEO_PROBLEMS.flatMap((p) =>
    SEO_CITIES.map((c) => ({
      type: "problem_location" as SeoPageType,
      path: `/probleme/${p.slug}/${c.slug}`,
      canonical: `${BASE_URL}/probleme/${p.slug}/${c.slug}`,
      indexable: true,
      priority: 0.6,
      changefreq: "monthly" as const,
    }))
  );
}

/** Generate guide entries */
export function getGuideEntries(): SeoPageEntry[] {
  return SEO_GUIDES.map((g) => ({
    type: "guide" as SeoPageType,
    path: `/guides/${g.slug}`,
    canonical: `${BASE_URL}/guides/${g.slug}`,
    indexable: true,
    priority: 0.6,
    changefreq: "monthly" as const,
  }));
}

/** Generate renovation+location entries */
export function getRenovationLocationEntries(): SeoPageEntry[] {
  return SEO_RENOVATIONS.flatMap((r) =>
    SEO_CITIES.map((c) => ({
      type: "renovation_location" as SeoPageType,
      path: `/renovation/${r.slug}/${c.slug}`,
      canonical: `${BASE_URL}/renovation/${r.slug}/${c.slug}`,
      indexable: true,
      priority: 0.7,
      changefreq: "monthly" as const,
    }))
  );
}

/** Indexability check — noindex pages without enough data */
export function shouldIndex(pageType: SeoPageType, hasData: boolean): boolean {
  if (!hasData) return false;
  // Neighborhoods and streets only indexed when real data exists
  if (pageType === "neighborhood" || pageType === "street") return hasData;
  return true;
}

/** Build sitemap XML for a segment */
export function buildSitemapXml(entries: SeoPageEntry[]): string {
  const urls = entries
    .filter((e) => e.indexable)
    .map(
      (e) =>
        `  <url>\n    <loc>${e.canonical}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ""}\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

/** Build sitemap index pointing to segmented sitemaps */
export function buildSitemapIndex(segments: string[]): string {
  const entries = segments
    .map(
      (s) =>
        `  <sitemap>\n    <loc>${BASE_URL}/sitemaps/${s}.xml</loc>\n    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>\n  </sitemap>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`;
}

/** Get all entries for a given segment */
export function getEntriesBySegment(segment: string): SeoPageEntry[] {
  switch (segment) {
    case "static": return STATIC_PAGES;
    case "cities": return getCityPageEntries();
    case "problems": return getProblemPageEntries();
    case "solutions": return getSolutionPageEntries();
    case "service-locations": return getServiceLocationEntries();
    case "problem-locations": return getProblemLocationEntries();
    case "guides": return getGuideEntries();
    default: return [];
  }
}

export const SITEMAP_SEGMENTS = [
  "static",
  "cities",
  "problems",
  "solutions",
  "service-locations",
  "problem-locations",
  "guides",
];

/** Total indexable page count */
export function getTotalIndexableCount(): number {
  return SITEMAP_SEGMENTS.reduce(
    (sum, seg) => sum + getEntriesBySegment(seg).filter((e) => e.indexable).length,
    0
  );
}
