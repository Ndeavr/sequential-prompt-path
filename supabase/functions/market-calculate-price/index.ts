import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PriceRequest {
  city_slug: string;
  trade_slug: string;
  specialty_slug?: string;
  urgency_level?: "low" | "medium" | "high" | "emergency";
  contractor_id?: string;
  lead_id?: string;
}

interface Multiplier {
  key: string;
  label_fr: string;
  value: number;
  reason: string;
}

// Fallback CPL estimates by trade category (cents)
const FALLBACK_CPL: Record<string, number> = {
  plomberie: 4500,
  electricite: 4000,
  toiture: 6500,
  renovation: 5500,
  chauffage: 5000,
  peinture: 3000,
  paysagement: 3500,
  default: 4500,
};

const FALLBACK_SIGNALS = {
  demand_score: 55,
  supply_score: 50,
  competition_index: 1.0,
  seasonality_index: 1.0,
  urgency_index: 1.0,
  scarcity_index: 1.0,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: PriceRequest = await req.json();
    const { city_slug, trade_slug, specialty_slug, urgency_level = "medium", contractor_id, lead_id } = body;

    if (!city_slug || !trade_slug) {
      return new Response(JSON.stringify({ error: "city_slug and trade_slug required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get latest market signal snapshot
    const { data: snapshot } = await supabase
      .from("market_signal_snapshots")
      .select("*")
      .eq("city_slug", city_slug)
      .eq("trade_slug", trade_slug)
      .order("snapshot_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const signals = snapshot || FALLBACK_SIGNALS;
    const fallbackUsed = !snapshot;

    // 2. Determine base CPL
    const googleCplCents = snapshot?.google_cpl_estimate_cents || FALLBACK_CPL[trade_slug] || FALLBACK_CPL.default;
    const markupPercent = 30; // UNPRO margin
    const basePriceCents = Math.round(googleCplCents * (1 + markupPercent / 100));

    // 3. Calculate multipliers
    const multipliers: Multiplier[] = [];

    // Demand
    const demandScore = signals.demand_score ?? 50;
    const demandMult = demandScore > 75 ? 1.4 : demandScore > 60 ? 1.15 : demandScore > 40 ? 1.0 : 0.85;
    multipliers.push({ key: "demand", label_fr: "Demande locale", value: demandMult, reason: demandScore > 60 ? "Forte demande dans cette zone" : "Demande normale" });

    // Seasonality
    const seasonMult = signals.seasonality_index ?? 1.0;
    multipliers.push({ key: "seasonality", label_fr: "Saisonnalité", value: seasonMult, reason: seasonMult > 1.1 ? "Haute saison pour ce service" : "Saison régulière" });

    // Urgency
    const urgencyMap: Record<string, number> = { emergency: 1.6, high: 1.3, medium: 1.0, low: 0.9 };
    const urgMult = urgencyMap[urgency_level] || 1.0;
    multipliers.push({ key: "urgency", label_fr: "Urgence", value: urgMult, reason: urgency_level === "emergency" ? "Intervention urgente requise" : "Urgence standard" });

    // Competition
    const compIndex = signals.competition_index ?? 1.0;
    const compMult = compIndex > 1.3 ? 0.85 : compIndex < 0.7 ? 1.3 : 1.0;
    multipliers.push({ key: "competition", label_fr: "Compétition", value: compMult, reason: compMult > 1.1 ? "Peu de compétiteurs — valeur accrue" : "Compétition normale" });

    // Scarcity
    const scarcityIdx = signals.scarcity_index ?? 1.0;
    const scarcityMult = scarcityIdx > 1.2 ? 1.25 : scarcityIdx < 0.8 ? 0.9 : 1.0;
    multipliers.push({ key: "scarcity", label_fr: "Rareté", value: scarcityMult, reason: scarcityMult > 1.1 ? "Peu d'entrepreneurs disponibles" : "Disponibilité normale" });

    // Predicted value (from avg_job_value if available)
    const avgJobCents = snapshot?.avg_job_value_cents || 0;
    const pvMult = avgJobCents > 500000 ? 1.3 : avgJobCents > 200000 ? 1.1 : 1.0;
    multipliers.push({ key: "predicted_value", label_fr: "Valeur prédite", value: pvMult, reason: pvMult > 1.05 ? "Projet à haute valeur estimée" : "Valeur standard" });

    // Price sensitivity
    const psMult = 1.0; // Neutral until lead prediction data feeds in
    multipliers.push({ key: "price_sensitivity", label_fr: "Sensibilité prix", value: psMult, reason: "Sensibilité standard" });

    // 4. Combine
    const combinedMultiplier = multipliers.reduce((acc, m) => acc * m.value, 1);
    const rawPrice = Math.round(basePriceCents * combinedMultiplier);

    // 5. Guardrails
    const minimumCents = 500;
    const maximumCents = 50000;
    const finalPrice = Math.max(minimumCents, Math.min(maximumCents, rawPrice));

    // 6. Build justification
    const justification = multipliers.map(m => ({
      factor: m.key,
      label_fr: m.label_fr,
      multiplier: Math.round(m.value * 100) / 100,
      impact: m.value > 1.05 ? "increase" : m.value < 0.95 ? "decrease" : "neutral",
      reason: m.reason,
    }));

    // 7. Confidence
    const confidence = fallbackUsed ? 40 : Math.min(95, 60 + (snapshot?.active_contractors || 0) * 2 + (snapshot?.active_leads || 0));

    // 8. Persist
    const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: priceRecord } = await supabase.from("market_dynamic_prices").insert({
      city_slug,
      trade_slug,
      specialty_slug: specialty_slug || null,
      base_cpl_cents: googleCplCents,
      unpro_markup_percent: markupPercent,
      base_price_cents: basePriceCents,
      demand_multiplier: demandMult,
      seasonality_multiplier: seasonMult,
      urgency_multiplier: urgMult,
      competition_multiplier: compMult,
      scarcity_multiplier: scarcityMult,
      predicted_value_multiplier: pvMult,
      price_sensitivity_multiplier: psMult,
      combined_multiplier: Math.round(combinedMultiplier * 1000) / 1000,
      final_price_cents: finalPrice,
      minimum_price_cents: minimumCents,
      maximum_price_cents: maximumCents,
      justification_json: justification,
      valid_from: new Date().toISOString(),
      valid_until: validUntil,
      confidence_score: confidence,
      fallback_used: fallbackUsed,
    }).select("id").single();

    // 9. Log served price
    if (priceRecord) {
      await supabase.from("market_price_served_log").insert({
        price_id: priceRecord.id,
        contractor_id: contractor_id || null,
        lead_id: lead_id || null,
        price_served_cents: finalPrice,
        context_json: { urgency_level, fallback_used: fallbackUsed },
      });
    }

    return new Response(JSON.stringify({
      price_id: priceRecord?.id,
      city_slug,
      trade_slug,
      base_cpl_cents: googleCplCents,
      base_price_cents: basePriceCents,
      multipliers: justification,
      combined_multiplier: Math.round(combinedMultiplier * 1000) / 1000,
      final_price_cents: finalPrice,
      final_price_display: `${(finalPrice / 100).toFixed(2)} $`,
      minimum_price_cents: minimumCents,
      maximum_price_cents: maximumCents,
      confidence_score: confidence,
      fallback_used: fallbackUsed,
      valid_until: validUntil,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
