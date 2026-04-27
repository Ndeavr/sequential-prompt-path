import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const citySlug = body.city_slug;
    const tradeSlug = body.trade_slug;

    // Get all active city+trade combos from territories or use provided
    let combos: { city_slug: string; trade_slug: string }[] = [];

    if (citySlug && tradeSlug) {
      combos = [{ city_slug: citySlug, trade_slug: tradeSlug }];
    } else {
      const { data: territories } = await supabase
        .from("territories")
        .select("city_slug, category_slug")
        .eq("is_active", true)
        .limit(200);
      combos = (territories || []).map(t => ({ city_slug: t.city_slug, trade_slug: t.category_slug }));
    }

    if (combos.length === 0) {
      // Generate mock combos for dev
      combos = [
        { city_slug: "montreal", trade_slug: "plomberie" },
        { city_slug: "laval", trade_slug: "electricite" },
        { city_slug: "quebec", trade_slug: "toiture" },
        { city_slug: "montreal", trade_slug: "renovation" },
        { city_slug: "longueuil", trade_slug: "chauffage" },
      ];
    }

    const now = new Date();
    const month = now.getMonth(); // 0-11
    const results: any[] = [];

    for (const combo of combos) {
      // Count active contractors
      const { count: contractorCount } = await supabase
        .from("contractors")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");

      // Count recent leads
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { count: leadCount } = await supabase
        .from("market_leads")
        .select("id", { count: "exact", head: true })
        .eq("city_slug", combo.city_slug)
        .gte("created_at", thirtyDaysAgo);

      // Seasonality Quebec-specific
      const seasonMap: Record<number, number> = {
        0: 0.8, 1: 0.75, 2: 0.9, 3: 1.1, 4: 1.3, 5: 1.4,
        6: 1.2, 7: 1.15, 8: 1.3, 9: 1.1, 10: 0.9, 11: 0.8,
      };
      const seasonality = seasonMap[month] || 1.0;

      // Demand score (based on leads vs capacity)
      const leads = leadCount || 0;
      const contractors = contractorCount || 1;
      const demandRatio = leads / Math.max(contractors, 1);
      const demandScore = Math.min(100, Math.round(40 + demandRatio * 20));

      // Supply score
      const supplyScore = Math.min(100, Math.round(contractors * 5));

      // Competition index
      const competitionIndex = contractors > 10 ? 1.3 : contractors > 5 ? 1.0 : 0.7;

      // Scarcity
      const scarcityIndex = contractors < 3 ? 1.4 : contractors < 8 ? 1.1 : 1.0;

      // Google CPL estimate (mock, per trade)
      const cplMap: Record<string, number> = {
        plomberie: 4500, electricite: 4000, toiture: 6500,
        renovation: 5500, chauffage: 5000, peinture: 3000,
        paysagement: 3500,
      };
      const googleCpl = cplMap[combo.trade_slug] || 4500;

      const snapshot = {
        city_slug: combo.city_slug,
        trade_slug: combo.trade_slug,
        signal_type: "composite",
        demand_score: demandScore,
        supply_score: supplyScore,
        competition_index: competitionIndex,
        seasonality_index: seasonality,
        urgency_index: 1.0,
        scarcity_index: scarcityIndex,
        google_cpl_estimate_cents: googleCpl,
        active_contractors: contractors || 0,
        active_leads: leads,
        avg_close_rate: 0.28,
        avg_job_value_cents: 350000,
        signals_json: { month, season: seasonality > 1.1 ? "haute" : "basse", leads, contractors },
        snapshot_at: now.toISOString(),
      };

      const { error } = await supabase.from("market_signal_snapshots").insert(snapshot);
      if (!error) results.push({ ...combo, status: "ok" });
      else results.push({ ...combo, status: "error", message: error.message });
    }

    return new Response(JSON.stringify({
      refreshed: results.filter(r => r.status === "ok").length,
      errors: results.filter(r => r.status === "error").length,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
