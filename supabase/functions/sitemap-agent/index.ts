/**
 * UNPRO — Sitemap Generator Agent
 *
 * Scheduled agent that:
 * 1. Counts all indexable URLs across segments
 * 2. Detects newly created/unpublished pages
 * 3. Logs sitemap health metrics
 * 4. Pings Google & Bing with updated sitemap
 *
 * Triggered via pg_cron (daily) or manual POST.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://unpro.ca";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  const results: Record<string, number> = {};
  const issues: string[] = [];

  try {
    // Count blog articles
    const { count: blogCount } = await sb
      .from("blog_articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "published");
    results.blog = blogCount || 0;

    // Count SEO pages
    const { count: seoCount } = await sb
      .from("seo_pages")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true);
    results.seo_pages = seoCount || 0;

    // Count problem×city pages
    const { count: problemCityCount } = await sb
      .from("home_problem_city_pages")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true);
    results.problem_city = problemCityCount || 0;

    // Count cities
    const { count: cityCount } = await sb
      .from("cities")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    results.cities = cityCount || 0;

    // Count problems
    const { count: problemCount } = await sb
      .from("home_problems")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    results.problems = problemCount || 0;

    // Count contractor profiles
    const { count: proCount } = await sb
      .from("contractor_public_pages")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true);
    results.contractor_profiles = proCount || 0;

    // Detect draft blog articles that could be published
    const { count: draftBlog } = await sb
      .from("blog_articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft");
    if ((draftBlog || 0) > 5) {
      issues.push(`${draftBlog} blog articles still in draft`);
    }

    // Detect unpublished SEO pages
    const { count: draftSeo } = await sb
      .from("seo_pages")
      .select("*", { count: "exact", head: true })
      .eq("is_published", false);
    if ((draftSeo || 0) > 0) {
      issues.push(`${draftSeo} SEO pages unpublished`);
    }

    // Detect unpublished problem×city pages
    const { count: draftPC } = await sb
      .from("home_problem_city_pages")
      .select("*", { count: "exact", head: true })
      .eq("is_published", false);
    if ((draftPC || 0) > 0) {
      issues.push(`${draftPC} problem×city pages unpublished`);
    }

    const totalUrls =
      10 + // static
      (results.blog || 0) +
      (results.seo_pages || 0) +
      (results.problem_city || 0) +
      (results.cities || 0) +
      (results.problems || 0) +
      (results.contractor_profiles || 0);

    results.total_indexable_urls = totalUrls;

    // Ping search engines
    const sitemapUrl = `${BASE_URL}/api/sitemap`;
    const pingResults: Record<string, string> = {};

    try {
      const googlePing = await fetch(
        `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
        { method: "GET" }
      );
      pingResults.google = googlePing.ok ? "ok" : `${googlePing.status}`;
    } catch {
      pingResults.google = "failed";
    }

    try {
      const bingPing = await fetch(
        `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
        { method: "GET" }
      );
      pingResults.bing = bingPing.ok ? "ok" : `${bingPing.status}`;
    } catch {
      pingResults.bing = "failed";
    }

    // Log run
    await sb.from("agent_logs").insert({
      agent_name: "sitemap-generator-agent",
      log_type: "run",
      message: `Sitemap audit: ${totalUrls} URLs across ${Object.keys(results).length - 1} segments. ${issues.length} issues.`,
      metadata: { results, issues, ping: pingResults },
    });

    // Log metrics
    await sb.from("agent_metrics").insert({
      metric_name: "sitemap_total_urls",
      metric_value: totalUrls,
      metric_category: "seo",
      metadata: results,
    });

    // Update agent status
    await sb
      .from("automation_agents")
      .update({
        last_run_at: new Date().toISOString(),
        last_status: "success",
        error_streak: 0,
        next_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("key", "sitemap-generator-agent");

    return new Response(
      JSON.stringify({
        success: true,
        total_urls: totalUrls,
        segments: results,
        issues,
        ping: pingResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Sitemap agent error:", err);

    await sb
      .from("automation_agents")
      .update({
        last_run_at: new Date().toISOString(),
        last_status: "error",
        error_streak: sb.rpc ? 1 : 1,
      })
      .eq("key", "sitemap-generator-agent");

    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
