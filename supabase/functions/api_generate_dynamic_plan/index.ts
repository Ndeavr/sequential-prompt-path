// Edge function — Generates a dynamic "Plan IA" recommendation for a contractor
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GrowthProfileInput {
  monthly_capacity: number;
  avg_ticket_cents: number;
  teams_count: number;
  target_growth_percent: number;
  preferred_job_types: string[];
  preferred_territories: string[];
  wants_exclusivity: boolean;
  max_distance_km: number;
  quality_vs_volume: number;
  seasonality_notes?: string;
}

// CANONICAL PRICING — base prices are loaded at runtime from `public.plans`.
// See _shared/planCatalog.ts. No hardcoded amounts.
import { canonicalPlanCode } from "../_shared/planCatalog.ts";

const PLAN_ORDER = ["presence", "local", "croissance", "pro", "premium", "domination"];
const planIdx = (s: string) => Math.max(0, PLAN_ORDER.indexOf(canonicalPlanCode(s)));
const maxPlan = (a: string, b: string) => (planIdx(a) >= planIdx(b) ? a : b);
const clamp = (n: number, mn: number, mx: number) => Math.max(mn, Math.min(mx, n));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const contractorId: string = body.contractor_id ?? userId;
    const profile: GrowthProfileInput = body.growth_profile;
    if (!profile) {
      return new Response(JSON.stringify({ error: "growth_profile required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load coefficients
    const { data: coefRows } = await admin
      .from("pricing_engine_coefficients")
      .select("key, value");
    const coef: Record<string, number> = {};
    (coefRows ?? []).forEach((r: any) => (coef[r.key] = Number(r.value)));
    const c = {
      competition_weight: coef.competition_weight ?? 0.3,
      demand_weight: coef.demand_weight ?? 0.25,
      ticket_weight: coef.ticket_weight ?? 0.2,
      exclusivity_premium: coef.exclusivity_premium ?? 0.4,
      rarity_premium: coef.rarity_premium ?? 0.25,
      seasonality_weight: coef.seasonality_weight ?? 0.1,
      min_price_floor_cents: coef.min_price_floor_cents ?? 14900,
      max_price_ceiling_cents: coef.max_price_ceiling_cents ?? 499900,
    };

    // Load market scores for preferred (territory × trade) pairs
    const territories = profile.preferred_territories?.length ? profile.preferred_territories : ["Montréal"];
    const trades = profile.preferred_job_types?.length ? profile.preferred_job_types : ["plomberie"];
    const { data: marketRows } = await admin
      .from("territory_market_scores")
      .select("*")
      .in("territory", territories)
      .in("trade", trades);

    // Aggregate
    let aggregated: any;
    if (marketRows && marketRows.length > 0) {
      const avg = (k: string) => marketRows!.reduce((a: number, r: any) => a + Number(r[k] ?? 0), 0) / marketRows!.length;
      aggregated = {
        territory: territories.join(", "),
        trade: trades[0],
        competitionScore: Math.round(avg("competition_score")),
        avgCpcCents: Math.round(avg("avg_cpc_cents")),
        demandScore: Math.round(avg("demand_score")),
        avgProjectValueCents: Math.round(avg("avg_project_value_cents")),
        aiDifficultyScore: Math.round(avg("ai_difficulty_score")),
        rarityScore: Math.round(avg("rarity_score")),
        exclusivitySlotsTotal: marketRows.reduce((a: number, r: any) => a + r.exclusivity_slots_total, 0),
        exclusivitySlotsTaken: marketRows.reduce((a: number, r: any) => a + r.exclusivity_slots_taken, 0),
        recommendedMinPlan: marketRows.reduce((a: string, r: any) => maxPlan(a, canonicalPlanCode(r.recommended_min_plan)), "presence"),
        seasonalityMultiplier: avg("seasonality_multiplier"),
      };
    } else {
      aggregated = {
        territory: territories.join(", "),
        trade: trades[0],
        competitionScore: 50,
        avgCpcCents: 500,
        demandScore: 50,
        avgProjectValueCents: profile.avg_ticket_cents,
        aiDifficultyScore: 50,
        rarityScore: 50,
        exclusivitySlotsTotal: 3,
        exclusivitySlotsTaken: 0,
        recommendedMinPlan: "pro",
        seasonalityMultiplier: 1.0,
      };
    }

    // Override lookup
    const { data: overrides } = await admin
      .from("pricing_overrides")
      .select("*")
      .or(`contractor_id.eq.${contractorId},and(territory.in.(${territories.join(",")}),trade.in.(${trades.join(",")}))`)
      .limit(1);
    const override = overrides?.[0] ?? null;

    // Score
    const ticketScore = clamp((aggregated.avgProjectValueCents / 1_000_000) * 100, 0, 100);
    const marketScore = Math.round(
      clamp(
        aggregated.demandScore * 0.35 +
          (100 - aggregated.aiDifficultyScore) * 0.2 +
          aggregated.rarityScore * 0.2 +
          ticketScore * 0.25,
        0,
        100,
      ),
    );
    const slotsScore =
      aggregated.exclusivitySlotsTotal > 0
        ? clamp(((aggregated.exclusivitySlotsTotal - aggregated.exclusivitySlotsTaken) / aggregated.exclusivitySlotsTotal) * 100, 0, 100)
        : 50;
    const capacityScore = clamp((profile.monthly_capacity / 50) * 100, 0, 100);
    const opportunityScore = Math.round(
      capacityScore * 0.35 + slotsScore * 0.35 + clamp(profile.target_growth_percent, 0, 100) * 0.3,
    );

    // Plan selection
    const ticketUsd = profile.avg_ticket_cents / 100;
    // Canonical base prices from the single source of truth.
    const { data: planRows, error: planErr } = await admin
      .from("plans")
      .select("code, monthly_price, active")
      .eq("audience", "contractor")
      .eq("active", true);
    if (planErr) {
      return new Response(
        JSON.stringify({ error: `plan_catalog_unavailable: ${planErr.message}` }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const PLAN_BASE_PRICES_CENTS: Record<string, number> = {};
    for (const row of planRows ?? []) {
      PLAN_BASE_PRICES_CENTS[(row as any).code] = (row as any).monthly_price ?? 0;
    }

    let plan: string;
    if (profile.monthly_capacity < 5) plan = "presence";
    else if (marketScore < 70) plan = "pro";
    else if (profile.wants_exclusivity && aggregated.exclusivitySlotsTaken < aggregated.exclusivitySlotsTotal)
      plan = ticketUsd > 8000 ? "domination" : "premium";
    else if (ticketUsd > 10000) plan = "premium";
    else plan = "croissance";
    plan = canonicalPlanCode(maxPlan(plan, aggregated.recommendedMinPlan));
    if (override?.forced_plan_slug) plan = canonicalPlanCode(override.forced_plan_slug);

    const basePrice = PLAN_BASE_PRICES_CENTS[plan];
    if (!basePrice) {
      return new Response(
        JSON.stringify({ error: `plan_price_missing: ${plan}` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const marketMod =
      (aggregated.competitionScore * c.competition_weight +
        aggregated.demandScore * c.demand_weight +
        clamp((profile.avg_ticket_cents / 500_000) * 100, 0, 100) * c.ticket_weight) /
      100 /
      3;
    const slotsAvailable = aggregated.exclusivitySlotsTotal - aggregated.exclusivitySlotsTaken > 0;
    const exclMod = profile.wants_exclusivity && slotsAvailable ? c.exclusivity_premium : 0;
    const rarityMod = aggregated.rarityScore > 70 ? c.rarity_premium : 0;
    const seasonMod = (aggregated.seasonalityMultiplier - 1) * c.seasonality_weight * 10;
    let finalPrice = basePrice * (1 + marketMod + exclMod + rarityMod + seasonMod);
    let overrideApplied = false;
    if (override?.forced_price_cents) {
      finalPrice = override.forced_price_cents;
      overrideApplied = true;
    }
    finalPrice = clamp(Math.round(finalPrice), c.min_price_floor_cents, c.max_price_ceiling_cents);

    // Appointments & revenue
    const planMult: Record<string, number> = { presence: 0.3, local: 0.4, croissance: 0.55, pro: 0.7, premium: 1.0, domination: 1.8 };
    const target = profile.monthly_capacity * (planMult[plan] ?? 1) * (0.6 + 0.4 * (aggregated.demandScore / 100));
    const apptMin = Math.max(1, Math.round(target * 0.7));
    const apptMax = Math.max(2, Math.round(target * 1.1));
    const revMin = Math.min(Math.round(apptMin * 0.45 * profile.avg_ticket_cents), 10_000_000);
    const revMax = Math.min(Math.round(apptMax * 0.65 * profile.avg_ticket_cents), 10_000_000);

    const slotsAvail = aggregated.exclusivitySlotsTotal - aggregated.exclusivitySlotsTaken;
    const exclusivityLevel =
      !profile.wants_exclusivity || slotsAvail <= 0 ? "none" : slotsAvail === 1 ? "full" : "partial";
    const territoryPriority =
      marketScore >= 80 ? "critical" : marketScore >= 65 ? "high" : marketScore >= 45 ? "medium" : "low";

    const bullets: string[] = [];
    if (aggregated.demandScore > 70) bullets.push(`Forte demande à ${aggregated.territory} (${aggregated.demandScore}/100)`);
    if (aggregated.competitionScore > 70) bullets.push(`Compétition élevée (${aggregated.competitionScore}/100) — visibilité IA essentielle`);
    if (profile.wants_exclusivity && slotsAvail > 0) bullets.push(`Exclusivité territoriale disponible — ${slotsAvail} slot(s)`);
    if (aggregated.rarityScore > 70) bullets.push(`Métier rare — opportunité unique`);
    if (profile.avg_ticket_cents > 1_000_000) bullets.push(`Ticket moyen élevé — peu de RDV très qualifiés requis`);
    if (overrideApplied) bullets.push(`Tarif personnalisé: ${override?.reason ?? ""}`);
    if (bullets.length === 0) bullets.push(`Plan optimisé pour votre marché et votre capacité`);

    const reason = {
      bullets,
      marketModifierPct: Math.round(marketMod * 1000) / 10,
      exclusivityModifierPct: Math.round(exclMod * 1000) / 10,
      rarityModifierPct: Math.round(rarityMod * 1000) / 10,
      seasonalityModifierPct: Math.round(seasonMod * 1000) / 10,
      overrideApplied,
    };

    // Upsert growth profile
    await admin.from("contractor_growth_profiles").upsert(
      {
        contractor_id: contractorId,
        user_id: userId,
        monthly_capacity: profile.monthly_capacity,
        avg_ticket_cents: profile.avg_ticket_cents,
        teams_count: profile.teams_count,
        target_growth_percent: profile.target_growth_percent,
        preferred_job_types: profile.preferred_job_types,
        preferred_territories: profile.preferred_territories,
        wants_exclusivity: profile.wants_exclusivity,
        max_distance_km: profile.max_distance_km,
        quality_vs_volume: profile.quality_vs_volume,
        seasonality_notes: profile.seasonality_notes ?? null,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "contractor_id" },
    );

    // Insert recommendation
    const priceModifierPct = basePrice ? Math.round(((finalPrice - basePrice) / basePrice) * 1000) / 10 : 0;
    const { data: recRow, error: recErr } = await admin
      .from("dynamic_plan_recommendations")
      .insert({
        contractor_id: contractorId,
        user_id: userId,
        recommended_plan_slug: plan,
        recommended_price_cents: finalPrice,
        base_plan_price_cents: basePrice,
        price_modifier_pct: priceModifierPct,
        estimated_monthly_appointments_min: apptMin,
        estimated_monthly_appointments_max: apptMax,
        estimated_revenue_min_cents: revMin,
        estimated_revenue_max_cents: revMax,
        exclusivity_level: exclusivityLevel,
        territory_priority: territoryPriority,
        market_score: marketScore,
        opportunity_score: opportunityScore,
        competition_score: aggregated.competitionScore,
        recommendation_reason: reason,
      })
      .select()
      .single();

    if (recErr) {
      return new Response(JSON.stringify({ error: recErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        recommendation: recRow,
        market: aggregated,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
