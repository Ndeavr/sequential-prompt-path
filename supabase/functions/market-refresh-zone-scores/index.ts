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

    // Get all leads with predictions grouped by city+trade
    const { data: leads, error: lErr } = await supabase
      .from("market_leads")
      .select("city_slug, trade_slug, market_lead_predictions(*)")
      .not("city_slug", "is", null)
      .not("trade_slug", "is", null);

    if (lErr) throw lErr;

    // Group by zone
    const zones: Record<string, any[]> = {};
    for (const lead of leads || []) {
      const key = `${lead.city_slug}|${lead.trade_slug}`;
      if (!zones[key]) zones[key] = [];
      zones[key].push(lead);
    }

    const results: any[] = [];

    for (const [key, zoneLeads] of Object.entries(zones)) {
      const [city_slug, trade_slug] = key.split("|");
      const preds = zoneLeads
        .map((l: any) => (Array.isArray(l.market_lead_predictions) ? l.market_lead_predictions[0] : l.market_lead_predictions))
        .filter(Boolean);

      const demandVolume = zoneLeads.length;
      const avgProfit = preds.length > 0
        ? Math.round(preds.reduce((s: number, p: any) => s + (p.predicted_profit_value || 0), 0) / preds.length)
        : 0;

      // Scarcity: fewer contractors = higher scarcity (mock: based on demand/supply ratio)
      const supplyScarcity = Math.min(demandVolume * 8, 100);
      const competition = Math.max(0, 100 - demandVolume * 5);
      const conversionFreq = preds.length > 0
        ? preds.reduce((s: number, p: any) => s + (p.predicted_close_probability || 0), 0) / preds.length
        : 0.25;

      // Seasonal factor: spring/summer higher in Quebec
      const month = new Date().getMonth();
      const seasonality = [0.7, 0.7, 0.85, 1.0, 1.2, 1.3, 1.3, 1.2, 1.1, 0.9, 0.75, 0.7][month] || 1.0;

      // Calculate score
      const demandNorm = Math.min(demandVolume / 50, 1) * 100;
      const profitNorm = Math.min(avgProfit / 500000, 1) * 100;
      const compNorm = 100 - competition;
      const convNorm = conversionFreq * 100;
      const seasonNorm = Math.min(seasonality * 50, 100);

      const score = Math.round(
        demandNorm * 0.25 + profitNorm * 0.20 + supplyScarcity * 0.20 +
        compNorm * 0.15 + convNorm * 0.12 + seasonNorm * 0.08
      );

      const eligible = score >= 65 && supplyScarcity >= 60;
      const baseLeads = Math.max(demandVolume, 3);
      const avgLeadPrice = Math.round(avgProfit * 0.18);
      const revenueProjection = baseLeads * avgLeadPrice;
      const premiumSuggested = Math.round(revenueProjection * 0.35);

      const { error: upsertErr } = await supabase
        .from("market_zone_scores")
        .upsert({
          city_slug,
          trade_slug,
          zone_value_score: score,
          demand_volume: demandVolume,
          avg_predicted_profit_cents: avgProfit,
          supply_scarcity_score: supplyScarcity,
          competition_score: competition,
          conversion_frequency: conversionFreq,
          seasonality_factor: seasonality,
          exclusivity_eligible: eligible,
          suggested_premium_cents: premiumSuggested,
          revenue_projection_monthly_cents: revenueProjection,
          justification_json: { demandNorm, profitNorm, supplyScarcity, compNorm, convNorm, seasonNorm },
          computed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "city_slug,trade_slug" });

      if (upsertErr) console.error("Upsert error:", upsertErr);
      else results.push({ city_slug, trade_slug, score, eligible });

      // Auto-create exclusivity offer if eligible and none exists
      if (eligible) {
        const { data: existing } = await supabase
          .from("market_zone_exclusivity")
          .select("id")
          .eq("city_slug", city_slug)
          .eq("trade_slug", trade_slug)
          .eq("status", "available")
          .limit(1);

        if (!existing?.length) {
          await supabase.from("market_zone_exclusivity").insert({
            city_slug,
            trade_slug,
            premium_price_cents: premiumSuggested,
            monthly_revenue_projection_cents: revenueProjection,
            justification: `Score ${score}/100 — forte demande, faible compétition`,
            status: "available",
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, zones_processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
