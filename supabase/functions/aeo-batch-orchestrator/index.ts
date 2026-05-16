// AEO Batch Orchestrator — kicks off generation for N pending pages
// from the AEO registries. Calls aeo-generate-blocks per row.
// Designed to be cron-tickled (daily) or admin-invoked.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BatchInput {
  kind: "problem_city" | "service_city";
  limit?: number;
  dry_run?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { kind, limit = 25, dry_run = false } = (await req.json()) as BatchInput;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let pending: any[] = [];
    if (kind === "problem_city") {
      const { data } = await supabase
        .from("aeo_problem_pages")
        .select("canonical_url, problem_slug, city_slug")
        .eq("status", "draft")
        .limit(limit);
      pending = data ?? [];
    } else {
      const { data } = await supabase
        .from("aeo_service_pages")
        .select("canonical_url, service_slug, city_slug")
        .eq("status", "draft")
        .limit(limit);
      pending = data ?? [];
    }

    if (pending.length === 0) {
      return new Response(JSON.stringify({ ok: true, generated: 0, message: "Aucune page en attente." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load lookup data once
    const [{ data: problems }, { data: cities }] = await Promise.all([
      supabase.from("aeo_problems").select("*"),
      supabase.from("aeo_neighborhoods").select("*"),
    ]);
    const problemBySlug = new Map((problems ?? []).map((p: any) => [p.slug, p]));
    const cityBySlug = new Map((cities ?? []).map((c: any) => [c.slug, c]));

    const runOne = async (row: any) => {
      let ctx: Record<string, unknown> = {};
      if (kind === "problem_city") {
        const p = problemBySlug.get(row.problem_slug);
        const c = cityBySlug.get(row.city_slug);
        if (!p || !c) return { url: row.canonical_url, ok: false, error: "missing_lookup" };
        ctx = {
          problem_slug: row.problem_slug,
          problem_label_fr: p.label_fr,
          problem_description_fr: p.description_fr,
          problem_category: p.category,
          urgency_default: p.urgency_default,
          city_label_fr: c.label_fr,
          housing_notes_fr: c.housing_notes_fr,
        };
      } else {
        const c = cityBySlug.get(row.city_slug);
        if (!c) return { url: row.canonical_url, ok: false, error: "missing_city" };
        ctx = {
          service_slug: row.service_slug,
          city_slug: row.city_slug,
          city_label_fr: c.label_fr,
          housing_notes_fr: c.housing_notes_fr,
        };
      }
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/aeo-generate-blocks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ page_kind: kind, page_url: row.canonical_url, context: ctx, dry_run }),
        });
        const json = await res.json();
        return { url: row.canonical_url, ok: json.ok, error: json.error };
      } catch (e) {
        return { url: row.canonical_url, ok: false, error: String(e) };
      }
    };

    // Parallel with concurrency cap = 5
    const results: any[] = [];
    const queue = [...pending];
    const workers = Array.from({ length: Math.min(5, queue.length) }, async () => {
      while (queue.length) {
        const row = queue.shift();
        if (!row) break;
        results.push(await runOne(row));
      }
    });
    await Promise.all(workers);

    return new Response(JSON.stringify({
      ok: true,
      attempted: pending.length,
      generated: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
