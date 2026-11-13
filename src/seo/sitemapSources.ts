/**
 * Pure selection + fail-soft rules for scripts/generate-sitemaps.ts.
 * Kept in src/ so Vitest can cover them; no I/O here.
 */

export type FetchResult<T> = { ok: true; rows: T[] } | { ok: false; error: string };

/**
 * A sitemap is (re)written only from a successful read. A failed read, or a
 * "successful" empty read that would wipe a previously non-empty file, keeps
 * the previous artifact (likely an outage or permission change, not real removals).
 */
export function planSitemapWrite(ok: boolean, nextCount: number, previousCount: number): "write" | "keep" {
  if (!ok) return "keep";
  if (nextCount === 0 && previousCount > 0) return "keep";
  return "write";
}

/** Number of <loc> entries in an existing sitemap file's text (0 when absent). */
export function countLocs(xml: string | null | undefined): number {
  return xml ? (xml.match(/<loc>/g) ?? []).length : 0;
}

/** Public, routable slug for /s/:slug or /s/:city/:service (lowercase, no test/demo/draft). */
const SEO_PAGE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/;
const NON_PUBLIC_SLUG = /(^|[-/])(test|demo|draft|brouillon|tmp|qa)([-/]|$)/;
/** Retired assistant brand: pages still naming it are kept out until their copy is corrected. */
const RETIRED_ASSISTANT = /\balex\b/i;
/** Legacy-brand slug segment (e.g. alex-ai-home-assistant): kept routable for compatibility, never listed. */
const RETIRED_ASSISTANT_SLUG = /(^|[-/])alex([-/]|$)/;

/** Minimum rendered body for a programmatic page (~250 words); thinner templates are not submitted. */
export const SEO_PAGE_MIN_BODY_CHARS = 1500;

export interface SeoPageRow {
  slug: string;
  updated_at: string | null;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  body_md: string | null;
}

export function isSitemapEligibleSeoPage(r: SeoPageRow): boolean {
  if (!r.slug || !SEO_PAGE_SLUG.test(r.slug) || NON_PUBLIC_SLUG.test(r.slug) || RETIRED_ASSISTANT_SLUG.test(r.slug)) return false;
  if (!r.title?.trim() || !r.meta_description?.trim() || !r.h1?.trim()) return false;
  const body = r.body_md ?? "";
  if (body.trim().length < SEO_PAGE_MIN_BODY_CHARS) return false;
  if (RETIRED_ASSISTANT.test(body) || RETIRED_ASSISTANT.test(r.title) || RETIRED_ASSISTANT.test(r.h1)) return false;
  return true;
}

export const SEO_ARTICLE_MIN_WORDS = 800;
const COMPLETED = new Set(["completed", "complete"]);

export interface SeoArticleRow {
  slug: string;
  updated_at: string | null;
  title: string | null;
  meta_description: string | null;
  content_html: string | null;
  word_count: number | null;
  generation_status: string | null;
}

export function isSitemapEligibleSeoArticle(r: SeoArticleRow): boolean {
  if (!r.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.slug) || NON_PUBLIC_SLUG.test(r.slug)) return false;
  if (!COMPLETED.has((r.generation_status ?? "").toLowerCase())) return false;
  if (!r.title?.trim() || !r.meta_description?.trim() || !r.content_html?.trim()) return false;
  if ((r.word_count ?? 0) < SEO_ARTICLE_MIN_WORDS) return false;
  if (RETIRED_ASSISTANT.test(r.content_html) || RETIRED_ASSISTANT.test(r.title)) return false;
  return true;
}

/** Keeps the first occurrence of each loc (input already ordered by preference). */
export function dedupeByLoc<T extends { loc: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.loc) ? false : (seen.add(i.loc), true)));
}

/** ISO lastmod from a real timestamp, or undefined (never a fabricated "now"). */
export function lastmodFrom(d?: string | null): string | undefined {
  if (!d) return undefined;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? undefined : t.toISOString();
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Legacy assistant aliases resolve to the public Clara entry and are never listed themselves. */
export const CLARA_PUBLIC_PATH = "/conversation";
export const LEGACY_ASSISTANT_PATHS = ["/alex", "/alex/voice", "/alex/analysis", "/alex/demo"] as const;
