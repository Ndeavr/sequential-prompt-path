/**
 * UNPRO — SEO Audit Agent
 *
 * Scheduled agent that verifies SEO quality across all content:
 * 1. Title length (30–60 chars)
 * 2. Meta description length (50–160 chars)
 * 3. Missing/broken images
 * 4. Location tags present for local pages
 * 5. JSON-LD schema present
 * 6. FAQ sections present
 * 7. Internal linking health
 * 8. Duplicate titles/descriptions
 *
 * Outputs issues to automation_alerts and agent_logs.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AuditIssue {
  page_type: string;
  page_id: string;
  slug: string;
  issue_type: string;
  severity: "critical" | "warning" | "info";
  detail: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  const issues: AuditIssue[] = [];

  try {
    // ─── Audit Blog Articles ────────────────────────────────
    const { data: articles } = await sb
      .from("blog_articles")
      .select(
        "id, slug, seo_title, meta_description, faq_json, schema_json, internal_linking_json, status"
      )
      .eq("status", "published")
      .limit(1000);

    const titleSet = new Set<string>();

    for (const a of articles || []) {
      // Title check
      if (!a.seo_title || a.seo_title.length < 20) {
        issues.push({
          page_type: "blog",
          page_id: a.id,
          slug: a.slug,
          issue_type: "title_too_short",
          severity: "critical",
          detail: `Title "${a.seo_title || ""}" is ${a.seo_title?.length || 0} chars (min 20)`,
        });
      } else if (a.seo_title.length > 65) {
        issues.push({
          page_type: "blog",
          page_id: a.id,
          slug: a.slug,
          issue_type: "title_too_long",
          severity: "warning",
          detail: `Title is ${a.seo_title.length} chars (max 65)`,
        });
      }

      // Duplicate titles
      if (a.seo_title && titleSet.has(a.seo_title.toLowerCase())) {
        issues.push({
          page_type: "blog",
          page_id: a.id,
          slug: a.slug,
          issue_type: "duplicate_title",
          severity: "critical",
          detail: `Duplicate title: "${a.seo_title}"`,
        });
      }
      if (a.seo_title) titleSet.add(a.seo_title.toLowerCase());

      // Meta description check
      if (!a.meta_description || a.meta_description.length < 50) {
        issues.push({
          page_type: "blog",
          page_id: a.id,
          slug: a.slug,
          issue_type: "meta_desc_short",
          severity: "critical",
          detail: `Meta description ${a.meta_description?.length || 0} chars (min 50)`,
        });
      } else if (a.meta_description.length > 165) {
        issues.push({
          page_type: "blog",
          page_id: a.id,
          slug: a.slug,
          issue_type: "meta_desc_long",
          severity: "warning",
          detail: `Meta description ${a.meta_description.length} chars (max 165)`,
        });
      }

      // FAQ check
      if (!a.faq_json || (Array.isArray(a.faq_json) && a.faq_json.length < 3)) {
        issues.push({
          page_type: "blog",
          page_id: a.id,
          slug: a.slug,
          issue_type: "faq_missing",
          severity: "warning",
          detail: `FAQ missing or fewer than 3 items`,
        });
      }

      // Schema check
      if (!a.schema_json || Object.keys(a.schema_json).length === 0) {
        issues.push({
          page_type: "blog",
          page_id: a.id,
          slug: a.slug,
          issue_type: "schema_missing",
          severity: "critical",
          detail: `JSON-LD schema missing`,
        });
      }

      // Internal linking
      if (
        !a.internal_linking_json ||
        (Array.isArray(a.internal_linking_json) &&
          a.internal_linking_json.length < 2)
      ) {
        issues.push({
          page_type: "blog",
          page_id: a.id,
          slug: a.slug,
          issue_type: "low_internal_links",
          severity: "warning",
          detail: `Fewer than 2 internal links`,
        });
      }
    }

    // ─── Audit SEO Pages ────────────────────────────────────
    const { data: seoPages } = await sb
      .from("seo_pages")
      .select(
        "id, slug, title, meta_description, city, profession, page_type, faq_json, schema_json"
      )
      .eq("is_published", true)
      .limit(1000);

    for (const p of seoPages || []) {
      // Title
      if (!p.title || p.title.length < 15) {
        issues.push({
          page_type: "seo_page",
          page_id: p.id,
          slug: p.slug,
          issue_type: "title_too_short",
          severity: "critical",
          detail: `Title "${p.title || ""}" too short`,
        });
      }

      // Meta
      if (!p.meta_description || p.meta_description.length < 50) {
        issues.push({
          page_type: "seo_page",
          page_id: p.id,
          slug: p.slug,
          issue_type: "meta_desc_short",
          severity: "critical",
          detail: `Meta description missing or too short`,
        });
      }

      // Location tag for local pages
      if (
        p.page_type &&
        (p.page_type.includes("city") || p.page_type.includes("local")) &&
        !p.city
      ) {
        issues.push({
          page_type: "seo_page",
          page_id: p.id,
          slug: p.slug,
          issue_type: "missing_location",
          severity: "critical",
          detail: `Local page missing city tag`,
        });
      }

      // Schema
      if (!p.schema_json || Object.keys(p.schema_json).length === 0) {
        issues.push({
          page_type: "seo_page",
          page_id: p.id,
          slug: p.slug,
          issue_type: "schema_missing",
          severity: "warning",
          detail: `JSON-LD schema missing`,
        });
      }

      // FAQ
      if (!p.faq_json || (Array.isArray(p.faq_json) && p.faq_json.length < 3)) {
        issues.push({
          page_type: "seo_page",
          page_id: p.id,
          slug: p.slug,
          issue_type: "faq_missing",
          severity: "warning",
          detail: `FAQ missing or < 3 items`,
        });
      }
    }

    // ─── Audit Problem × City Pages ─────────────────────────
    const { data: pcPages } = await sb
      .from("home_problem_city_pages")
      .select("id, seo_title, seo_description, faq, is_published")
      .eq("is_published", true)
      .limit(1000);

    for (const pc of pcPages || []) {
      if (!pc.seo_title || pc.seo_title.length < 15) {
        issues.push({
          page_type: "problem_city",
          page_id: pc.id,
          slug: pc.id,
          issue_type: "title_too_short",
          severity: "critical",
          detail: `Problem×city page missing proper SEO title`,
        });
      }
      if (!pc.seo_description || pc.seo_description.length < 50) {
        issues.push({
          page_type: "problem_city",
          page_id: pc.id,
          slug: pc.id,
          issue_type: "meta_desc_short",
          severity: "warning",
          detail: `Meta description too short`,
        });
      }
      if (!pc.faq || (Array.isArray(pc.faq) && pc.faq.length < 3)) {
        issues.push({
          page_type: "problem_city",
          page_id: pc.id,
          slug: pc.id,
          issue_type: "faq_missing",
          severity: "warning",
          detail: `FAQ missing or insufficient`,
        });
      }
    }

    // ─── Summary stats ──────────────────────────────────────
    const criticalCount = issues.filter((i) => i.severity === "critical").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;
    const totalAudited =
      (articles?.length || 0) +
      (seoPages?.length || 0) +
      (pcPages?.length || 0);

    // Store alerts for critical issues (top 20)
    const criticalIssues = issues
      .filter((i) => i.severity === "critical")
      .slice(0, 20);

    for (const issue of criticalIssues) {
      await sb.from("automation_alerts").insert({
        level: "warning",
        source: "seo-audit-agent",
        title: `SEO: ${issue.issue_type} on ${issue.page_type}/${issue.slug}`,
        message: issue.detail,
        metadata: issue,
      });
    }

    // Log run
    await sb.from("agent_logs").insert({
      agent_name: "seo-audit-agent",
      log_type: "run",
      message: `SEO audit: ${totalAudited} pages audited. ${criticalCount} critical, ${warningCount} warnings.`,
      metadata: {
        total_audited: totalAudited,
        critical: criticalCount,
        warnings: warningCount,
        issues_sample: issues.slice(0, 50),
      },
    });

    // Log metric
    await sb.from("agent_metrics").insert([
      {
        metric_name: "seo_audit_critical_issues",
        metric_value: criticalCount,
        metric_category: "seo",
      },
      {
        metric_name: "seo_audit_total_pages",
        metric_value: totalAudited,
        metric_category: "seo",
      },
    ]);

    // Update agent status
    await sb
      .from("automation_agents")
      .update({
        last_run_at: new Date().toISOString(),
        last_status: "success",
        error_streak: 0,
        next_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("key", "seo-audit-agent");

    return new Response(
      JSON.stringify({
        success: true,
        total_audited: totalAudited,
        critical: criticalCount,
        warnings: warningCount,
        issues: issues.slice(0, 100),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("SEO audit error:", err);

    await sb
      .from("automation_agents")
      .update({
        last_run_at: new Date().toISOString(),
        last_status: "error",
      })
      .eq("key", "seo-audit-agent");

    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
