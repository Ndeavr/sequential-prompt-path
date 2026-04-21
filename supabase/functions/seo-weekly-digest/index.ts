/**
 * UNPRO — SEO Weekly Digest
 * Returns a JSON summary of SEO health issues for alerting.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Contractors without public pages
  const { count: totalContractors } = await sb.from("contractors").select("id", { count: "exact", head: true }).not("business_name", "is", null);
  const { count: publishedPages } = await sb.from("contractor_public_pages").select("id", { count: "exact", head: true }).eq("is_published", true);
  const missingPages = (totalContractors || 0) - (publishedPages || 0);

  // Blog articles
  const { count: blogCount } = await sb.from("blog_articles").select("id", { count: "exact", head: true }).eq("status", "published");

  // SEO pages
  const { count: seoPageCount } = await sb.from("seo_pages").select("id", { count: "exact", head: true }).eq("is_published", true);

  // Cities
  const { count: cityCount } = await sb.from("cities").select("id", { count: "exact", head: true }).eq("is_active", true);

  // Thin content (descriptions < 100 chars)
  const { data: thinPages } = await sb.from("contractor_public_pages").select("slug, seo_description").eq("is_published", true);
  const thinCount = (thinPages || []).filter(p => !p.seo_description || p.seo_description.length < 100).length;

  const digest = {
    generated_at: new Date().toISOString(),
    summary: {
      total_contractors: totalContractors || 0,
      published_contractor_pages: publishedPages || 0,
      contractors_missing_pages: missingPages,
      blog_articles_published: blogCount || 0,
      seo_pages_published: seoPageCount || 0,
      active_cities: cityCount || 0,
      thin_content_pages: thinCount,
    },
    alerts: [
      ...(missingPages > 0 ? [`${missingPages} entrepreneur(s) n'ont pas de page publique`] : []),
      ...(thinCount > 0 ? [`${thinCount} page(s) avec contenu trop mince`] : []),
    ],
    sitemap_segments: ["static", "blog", "seo-pages", "cities", "problems", "solutions", "contractor-profiles", "service-locations", "problem-locations", "guides", "condo", "renovation-locations"],
  };

  return new Response(JSON.stringify(digest), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
