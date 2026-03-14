/**
 * UNPRO — Sitemap Edge Function
 * Serves segmented sitemaps and sitemap index.
 * GET /sitemap?segment=cities  → sitemap XML
 * GET /sitemap                 → sitemap index
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://unpro.ca";

const SEGMENTS = ["static", "cities", "problems", "solutions", "service-locations", "problem-locations", "guides"];

// Inline data for edge function (avoid importing frontend modules)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const segment = url.searchParams.get("segment");

  const xmlHeaders = { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" };

  // Sitemap index
  if (!segment) {
    const entries = SEGMENTS.map(
      (s) =>
        `  <sitemap>\n    <loc>${BASE_URL}/api/sitemap?segment=${s}</loc>\n    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>\n  </sitemap>`
    ).join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`;
    return new Response(xml, { headers: xmlHeaders });
  }

  // Individual segment
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  let urls: { loc: string; priority: string; changefreq: string }[] = [];

  try {
    switch (segment) {
      case "static":
        urls = [
          { loc: "/", priority: "1.0", changefreq: "daily" },
          { loc: "/services", priority: "0.9", changefreq: "weekly" },
          { loc: "/search", priority: "0.8", changefreq: "daily" },
          { loc: "/verifier-entrepreneur", priority: "0.7", changefreq: "monthly" },
          { loc: "/answers", priority: "0.7", changefreq: "weekly" },
          { loc: "/copropriete", priority: "0.7", changefreq: "monthly" },
        ];
        break;

      case "cities": {
        const { data } = await sb.from("cities").select("slug").eq("is_active", true);
        urls = (data || []).map((c: any) => ({ loc: `/ville/${c.slug}`, priority: "0.7", changefreq: "monthly" }));
        break;
      }

      case "problems": {
        const { data } = await sb.from("home_problems").select("slug").eq("is_active", true);
        urls = (data || []).map((p: any) => ({ loc: `/probleme/${p.slug}`, priority: "0.8", changefreq: "monthly" }));
        break;
      }

      case "solutions": {
        const { data } = await sb.from("home_solutions").select("slug").eq("is_active", true);
        urls = (data || []).map((s: any) => ({ loc: `/solution/${s.slug}`, priority: "0.7", changefreq: "monthly" }));
        break;
      }

      case "service-locations": {
        // Generate from city × service_category combos (limited to populated ones)
        const { data: categories } = await sb.from("service_categories").select("slug").eq("is_active", true);
        const { data: cities } = await sb.from("cities").select("slug").eq("is_active", true);
        if (categories && cities) {
          for (const cat of categories) {
            for (const city of cities) {
              urls.push({ loc: `/services/${cat.slug}/${city.slug}`, priority: "0.6", changefreq: "monthly" });
            }
          }
        }
        break;
      }

      case "problem-locations": {
        const { data: problems } = await sb.from("home_problems").select("slug").eq("is_active", true);
        const { data: cities } = await sb.from("cities").select("slug").eq("is_active", true);
        if (problems && cities) {
          for (const p of problems) {
            for (const c of cities) {
              urls.push({ loc: `/probleme/${p.slug}/${c.slug}`, priority: "0.6", changefreq: "monthly" });
            }
          }
        }
        break;
      }

      case "guides":
        // Static guides — hardcoded slugs
        urls = [
          "comment-choisir-entrepreneur",
          "subventions-renovation",
          "entretien-saisonnier",
          "preparer-hiver",
        ].map((s) => ({ loc: `/guides/${s}`, priority: "0.6", changefreq: "monthly" }));
        break;

      default:
        return new Response("Invalid segment", { status: 400, headers: corsHeaders });
    }
  } catch (err) {
    console.error("Sitemap error:", err);
    return new Response("Error generating sitemap", { status: 500, headers: corsHeaders });
  }

  const urlEntries = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${BASE_URL}${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
  return new Response(xml, { headers: xmlHeaders });
});
