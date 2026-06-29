// UNPRO Demand Intelligence — Server data for /pro/demande/:city/:category landing.
// PUBLIC: returns only aggregates and recruitment target metadata. No PII.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const city = url.searchParams.get("city");
    const category = url.searchParams.get("category");
    if (!city || !category) return json({ ok: false, error: "city+category required" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const normalizedCity = decodeURIComponent(city).trim();
    const normalizedCategory = decodeURIComponent(category).trim().toLowerCase();

    const [{ data: market }, { data: target }, { data: neighbors }] = await Promise.all([
      sb.from("market_demand")
        .select("homeowner_count, total_projects, estimated_revenue, estimated_ltv, avg_urgency, supply_count, gap_score, pressure_score, last_signal_at")
        .eq("city", normalizedCity)
        .eq("category", normalizedCategory)
        .maybeSingle(),
      sb.from("contractor_recruitment_targets")
        .select("id, landing_slug, status, priority_score, waiting_count, estimated_revenue")
        .eq("city", normalizedCity)
        .eq("category", normalizedCategory)
        .maybeSingle(),
      sb.from("market_demand")
        .select("city, category, homeowner_count, estimated_revenue, pressure_score")
        .eq("category", normalizedCategory)
        .neq("city", normalizedCity)
        .order("pressure_score", { ascending: false })
        .limit(5),
    ]);

    return json({
      ok: true,
      city: normalizedCity,
      category: normalizedCategory,
      market: market ?? {
        homeowner_count: 0, total_projects: 0, estimated_revenue: 0, estimated_ltv: 0,
        avg_urgency: 0, supply_count: 0, gap_score: 0, pressure_score: 0, last_signal_at: null,
      },
      recruitment_target: target,
      neighbor_segments: neighbors ?? [],
    });
  } catch (e) {
    console.error("recruitment-landing-resolver error", e);
    return json({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
