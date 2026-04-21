/**
 * UNPRO — Sitemap Edge Function (Google Best Practices)
 *
 * Serves segmented sitemaps and sitemap index.
 * - GET /sitemap                     → sitemap index (links to all segments)
 * - GET /sitemap?segment=<name>      → individual sitemap XML
 *
 * Segments: static, blog, seo-pages, problem-city, cities, problems,
 *           solutions, service-locations, problem-locations, guides,
 *           contractor-profiles, condo
 *
 * Google best practices applied:
 * - Max 50,000 URLs per sitemap segment
 * - <lastmod> from actual DB updated_at
 * - hreflang for bilingual pages (future)
 * - image:image for pages with known hero images
 * - Proper XML escaping
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://unpro.ca";

const SEGMENTS = [
  "static",
  "blog",
  "seo-pages",
  "problem-city",
  "cities",
  "problems",
  "solutions",
  "service-locations",
  "problem-locations",
  "guides",
  "contractor-profiles",
  "condo",
  "renovation-locations",
];

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toLastmod(d?: string | null): string {
  if (!d) return new Date().toISOString().split("T")[0];
  return new Date(d).toISOString().split("T")[0];
}

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  priority: string;
  changefreq: string;
  imageUrl?: string;
  imageCaption?: string;
}

function renderUrlset(urls: SitemapUrl[]): string {
  const hasImages = urls.some((u) => u.imageUrl);
  const xmlns = hasImages
    ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
    : "";

  const entries = urls
    .map((u) => {
      let entry = `  <url>\n    <loc>${escXml(BASE_URL + u.loc)}</loc>`;
      if (u.lastmod) entry += `\n    <lastmod>${u.lastmod}</lastmod>`;
      entry += `\n    <changefreq>${u.changefreq}</changefreq>`;
      entry += `\n    <priority>${u.priority}</priority>`;
      if (u.imageUrl) {
        entry += `\n    <image:image>`;
        entry += `\n      <image:loc>${escXml(u.imageUrl)}</image:loc>`;
        if (u.imageCaption)
          entry += `\n      <image:caption>${escXml(u.imageCaption)}</image:caption>`;
        entry += `\n    </image:image>`;
      }
      entry += `\n  </url>`;
      return entry;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${xmlns}>\n${entries}\n</urlset>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const segment = url.searchParams.get("segment");

  const xmlHeaders = {
    ...corsHeaders,
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600, s-maxage=7200",
  };

  // ─── Sitemap index ────────────────────────────────────────
  if (!segment) {
    const today = new Date().toISOString().split("T")[0];
    const fnBase = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sitemap`;
    const entries = SEGMENTS.map(
      (s) =>
        `  <sitemap>\n    <loc>${fnBase}?segment=${s}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`
    ).join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`;
    return new Response(xml, { headers: xmlHeaders });
  }

  // ─── Individual segments ──────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  let urls: SitemapUrl[] = [];

  try {
    switch (segment) {
      // ── Static pages ──────────────────────────────────────
      case "static":
        urls = [
          { loc: "/", priority: "1.0", changefreq: "daily" },
          { loc: "/services", priority: "0.9", changefreq: "weekly" },
          { loc: "/search", priority: "0.8", changefreq: "daily" },
          { loc: "/verifier-entrepreneur", priority: "0.7", changefreq: "monthly" },
          { loc: "/answers", priority: "0.7", changefreq: "weekly" },
          { loc: "/copropriete", priority: "0.7", changefreq: "monthly" },
          { loc: "/blog", priority: "0.8", changefreq: "daily" },
          { loc: "/seo-sitemap", priority: "0.3", changefreq: "weekly" },
          { loc: "/comment-ca-marche", priority: "0.7", changefreq: "monthly" },
          { loc: "/guides", priority: "0.6", changefreq: "weekly" },
          { loc: "/communique", priority: "0.5", changefreq: "yearly" },
          { loc: "/proprietaires", priority: "0.8", changefreq: "monthly" },
          { loc: "/entrepreneurs", priority: "0.8", changefreq: "monthly" },
          { loc: "/courtiers", priority: "0.7", changefreq: "monthly" },
          { loc: "/pricing", priority: "0.7", changefreq: "monthly" },
          { loc: "/compare-quotes", priority: "0.7", changefreq: "monthly" },
          { loc: "/score-maison", priority: "0.7", changefreq: "monthly" },
          { loc: "/aipp-score", priority: "0.7", changefreq: "monthly" },
        ];
        break;

      // ── Blog articles ─────────────────────────────────────
      case "blog": {
        const { data } = await sb
          .from("blog_articles")
          .select("slug, updated_at, seo_title")
          .eq("status", "published")
          .order("updated_at", { ascending: false })
          .limit(50000);
        urls = (data || []).map((a: any) => ({
          loc: `/blog/${a.slug}`,
          lastmod: toLastmod(a.updated_at),
          priority: "0.7",
          changefreq: "monthly",
        }));
        break;
      }

      // ── SEO pages (profession×city, problem×city) ─────────
      case "seo-pages": {
        const { data } = await sb
          .from("seo_pages")
          .select("slug, updated_at, page_type")
          .eq("is_published", true)
          .order("updated_at", { ascending: false })
          .limit(50000);
        urls = (data || []).map((p: any) => ({
          loc: `/s/${p.slug}`,
          lastmod: toLastmod(p.updated_at),
          priority: p.page_type === "profession_city" ? "0.8" : "0.7",
          changefreq: "monthly",
        }));
        break;
      }

      // ── Problem × City pages ──────────────────────────────
      case "problem-city": {
        const { data } = await sb
          .from("home_problem_city_pages")
          .select("problem_id, city_id, updated_at, home_problems(slug), cities(slug)")
          .eq("is_published", true)
          .limit(50000);
        urls = (data || []).map((p: any) => ({
          loc: `/probleme/${p.home_problems?.slug}/${p.cities?.slug}`,
          lastmod: toLastmod(p.updated_at),
          priority: "0.7",
          changefreq: "monthly",
        }));
        break;
      }

      // ── Cities ────────────────────────────────────────────
      case "cities": {
        const { data } = await sb
          .from("cities")
          .select("slug")
          .eq("is_active", true);
        urls = (data || []).map((c: any) => ({
          loc: `/ville/${c.slug}`,
          priority: "0.7",
          changefreq: "monthly",
        }));
        break;
      }

      // ── Problems ──────────────────────────────────────────
      case "problems": {
        const { data } = await sb
          .from("home_problems")
          .select("slug")
          .eq("is_active", true);
        urls = (data || []).map((p: any) => ({
          loc: `/probleme/${p.slug}`,
          priority: "0.8",
          changefreq: "monthly",
        }));
        break;
      }

      // ── Solutions ─────────────────────────────────────────
      case "solutions": {
        const { data } = await sb
          .from("home_solutions")
          .select("slug")
          .eq("is_active", true);
        urls = (data || []).map((s: any) => ({
          loc: `/solution/${s.slug}`,
          priority: "0.7",
          changefreq: "monthly",
        }));
        break;
      }

      // ── Service × City ────────────────────────────────────
      case "service-locations": {
        const { data: categories } = await sb
          .from("service_categories")
          .select("slug")
          .eq("is_active", true);
        const { data: cities } = await sb
          .from("cities")
          .select("slug")
          .eq("is_active", true);
        if (categories && cities) {
          for (const cat of categories) {
            for (const city of cities) {
              urls.push({
                loc: `/services/${cat.slug}/${city.slug}`,
                priority: "0.6",
                changefreq: "monthly",
              });
            }
          }
        }
        break;
      }

      // ── Problem × City (URL pattern 2) ───────────────────
      case "problem-locations": {
        const { data: problems } = await sb
          .from("home_problems")
          .select("slug")
          .eq("is_active", true);
        const { data: cities } = await sb
          .from("cities")
          .select("slug")
          .eq("is_active", true);
        if (problems && cities) {
          for (const p of problems) {
            for (const c of cities) {
              urls.push({
                loc: `/probleme/${p.slug}/${c.slug}`,
                priority: "0.6",
                changefreq: "monthly",
              });
            }
          }
        }
        break;
      }

      // ── Guides ────────────────────────────────────────────
      case "guides":
        urls = [
          "comment-choisir-entrepreneur",
          "subventions-renovation",
          "entretien-saisonnier",
          "preparer-hiver",
        ].map((s) => ({
          loc: `/guides/${s}`,
          priority: "0.6",
          changefreq: "monthly",
        }));
        break;

      // ── Contractor public profiles ────────────────────────
      case "contractor-profiles": {
        const { data } = await sb
          .from("contractor_public_pages")
          .select("slug, updated_at")
          .eq("is_published", true)
          .limit(50000);
        urls = (data || []).map((c: any) => ({
          loc: `/pro/${c.slug}`,
          lastmod: toLastmod(c.updated_at),
          priority: "0.6",
          changefreq: "weekly",
        }));
        break;
      }

      // ── Condo pages ───────────────────────────────────────
      case "condo":
        urls = [
          { loc: "/copropriete", priority: "0.7", changefreq: "monthly" },
          { loc: "/copropriete/comment-ca-marche", priority: "0.6", changefreq: "monthly" },
        ];
        break;

      // ── Renovation × City ─────────────────────────────────
      case "renovation-locations": {
        const { data: renovationCategories } = await sb
          .from("service_categories")
          .select("slug")
          .eq("is_active", true);
        const { data: renovCities } = await sb
          .from("cities")
          .select("slug")
          .eq("is_active", true);
        if (renovationCategories && renovCities) {
          for (const r of renovationCategories) {
            for (const c of renovCities) {
              urls.push({
                loc: `/renovation/${r.slug}/${c.slug}`,
                priority: "0.6",
                changefreq: "monthly",
              });
            }
          }
        }
        break;
      }

      default:
        return new Response("Invalid segment", {
          status: 400,
          headers: corsHeaders,
        });
    }
  } catch (err) {
    console.error("Sitemap error:", err);
    return new Response("Error generating sitemap", {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(renderUrlset(urls), { headers: xmlHeaders });
});
