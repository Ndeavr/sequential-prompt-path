/**
 * UNPRO — Dynamic XML Sitemap Generator
 * Returns valid XML sitemap with all indexable canonical pages.
 * Excludes thin content, noindex pages, app routes, and duplicates.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ROOT = "https://unpro.ca";

// Static marketing pages with priorities
const STATIC_PAGES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/proprietaires", changefreq: "weekly", priority: "0.9" },
  { path: "/entrepreneurs", changefreq: "weekly", priority: "0.9" },
  { path: "/condo", changefreq: "weekly", priority: "0.8" },
  { path: "/pricing", changefreq: "weekly", priority: "0.8" },
  { path: "/compare-quotes", changefreq: "weekly", priority: "0.7" },
  { path: "/verifier-entrepreneur", changefreq: "weekly", priority: "0.7" },
  { path: "/score-maison", changefreq: "weekly", priority: "0.7" },
  { path: "/aipp-score", changefreq: "weekly", priority: "0.7" },
  { path: "/comment-fonctionne-ia", changefreq: "monthly", priority: "0.6" },
  { path: "/roadmap", changefreq: "monthly", priority: "0.5" },
  { path: "/couverture", changefreq: "monthly", priority: "0.6" },
  { path: "/guides", changefreq: "weekly", priority: "0.7" },
  { path: "/avis-verifies", changefreq: "weekly", priority: "0.6" },
  { path: "/courtiers", changefreq: "monthly", priority: "0.6" },
  { path: "/services", changefreq: "weekly", priority: "0.8" },
  { path: "/audit", changefreq: "monthly", priority: "0.6" },
  { path: "/alex", changefreq: "weekly", priority: "0.7" },
];

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function toW3CDate(d: string | null): string {
  if (!d) return new Date().toISOString().split("T")[0];
  try {
    return new Date(d).toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

Deno.serve(async (_req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split("T")[0];
    const entries: SitemapEntry[] = [];

    // 1. Static pages
    for (const p of STATIC_PAGES) {
      entries.push({ loc: `${ROOT}${p.path}`, lastmod: today, changefreq: p.changefreq, priority: p.priority });
    }

    // 2. SEO pages (profession_city, problem_city, etc.)
    const { data: seoPages } = await sb
      .from("seo_pages")
      .select("slug, updated_at")
      .eq("is_published", true)
      .order("slug");

    if (seoPages) {
      for (const p of seoPages) {
        if (p.slug) {
          entries.push({
            loc: `${ROOT}/s/${escapeXml(p.slug)}`,
            lastmod: toW3CDate(p.updated_at),
            changefreq: "weekly",
            priority: "0.7",
          });
        }
      }
    }

    // 3. SEO articles / blog
    const { data: articles } = await sb
      .from("seo_articles")
      .select("slug, updated_at, word_count")
      .eq("published", true)
      .order("slug");

    if (articles) {
      for (const a of articles) {
        // Quality guard: skip thin content (<200 words)
        if (a.slug && (a.word_count == null || a.word_count >= 200)) {
          entries.push({
            loc: `${ROOT}/blog/${escapeXml(a.slug)}`,
            lastmod: toW3CDate(a.updated_at),
            changefreq: "monthly",
            priority: "0.6",
          });
        }
      }
    }

    // 4. Contractor public profiles
    const { data: contractors } = await sb
      .from("contractors")
      .select("slug, updated_at")
      .not("slug", "is", null)
      .order("slug");

    if (contractors) {
      for (const c of contractors) {
        if (c.slug) {
          entries.push({
            loc: `${ROOT}/entrepreneur/${escapeXml(c.slug)}`,
            lastmod: toW3CDate(c.updated_at),
            changefreq: "monthly",
            priority: "0.5",
          });
        }
      }
    }

    // Deduplicate by loc
    const seen = new Set<string>();
    const unique = entries.filter((e) => {
      if (seen.has(e.loc)) return false;
      seen.add(e.loc);
      return true;
    });

    // Build XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${unique
  .map(
    (e) => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "X-Sitemap-Count": String(unique.length),
      },
    });
  } catch (err) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    });
  }
});
