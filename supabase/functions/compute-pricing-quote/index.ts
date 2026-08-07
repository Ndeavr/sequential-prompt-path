// UNPRO — Personalized Contractor Pricing Quote (v2026.08-growth)
// Deterministic, server-side pricing engine.
// Single source of truth: public.pricing_config (weights) + public.plans (catalog)
// Market factors: public.market_demand, public.city_service_demand_grid,
//                 public.territory_availability(trade, city)
// Never invents market data: when signals are missing, factors stay neutral (1.00)
// and data_status downgrades to "declared" or "insufficient".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Input {
  trade_primary: string;
  trade_secondary?: string | null;
  service_categories?: string[];
  city: string;
  service_cities?: string[];
  service_radius_km?: number;
  target_monthly_appointments: number;
  average_project_value: number; // CAD dollars
  monthly_capacity: number;
  close_rate_estimate: number; // 0..1 or 0..100
  business_objective?:
    | "visibility"
    | "few_projects"
    | "grow"
    | "expand_territory"
    | "dominate"
    | "exclusivity";
  wants_exclusivity?: boolean;
  preferred_project_types?: string[];
  seasonal_priority?: "spring" | "summer" | "fall" | "winter" | "all";
  current_ai_visibility_score?: number; // 0..100
  rbq_number?: string | null;
  company_name?: string | null;
  website_url?: string | null;
  contractor_id?: string | null;
  session_id?: string | null;
}

interface PlanRow {
  code: string;
  name: string;
  monthly_price: number; // cents
  appointments_included: number | null;
  tier_rank: number;
  stripe_monthly_price_id: string | null;
}

const DEFAULT_WEIGHTS = {
  demand_factor_min: 0.9,
  demand_factor_max: 1.25,
  competition_factor_min: 0.9,
  competition_factor_max: 1.2,
  capacity_factor_min: 0.85,
  capacity_factor_max: 1.15,
  exclusivity_multiplier: 1.45,
  territory_multiplier_per_extra_city: 0.12,
  territory_multiplier_cap: 1.6,
  volume_per_appointment_cents: 9000,
  objective_multipliers: {
    visibility: 0.85,
    few_projects: 1.0,
    grow: 1.15,
    expand_territory: 1.25,
    dominate: 1.4,
    exclusivity: 1.45,
  } as Record<string, number>,
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const round2 = (n: number) => Math.round(n * 100) / 100;
const slug = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function seasonNow(month: number) {
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

function seasonalityFor(priority: string | undefined, month: number): number {
  const season = seasonNow(month);
  if (!priority || priority === "all") {
    return season === "summer"
      ? 1.1
      : season === "spring"
        ? 1.08
        : season === "fall"
          ? 1.0
          : 0.95;
  }
  return priority === season ? 1.15 : 0.98;
}

/** Deterministic plan selection driven by required volume + objective. */
function pickPlan(input: Input, plans: PlanRow[]): PlanRow {
  const ordered = [...plans].sort((a, b) => a.tier_rank - b.tier_rank);
  const target = Math.max(0, input.target_monthly_appointments ?? 0);
  const objective = input.business_objective ?? "grow";

  if (input.wants_exclusivity || objective === "exclusivity" || objective === "dominate") {
    return ordered[ordered.length - 1];
  }
  if (objective === "visibility" && target <= 1) return ordered[0];

  // Smallest plan whose included appointments cover the target.
  const fit = ordered.find((p) => (p.appointments_included ?? 0) >= target);
  if (fit) return fit;
  return ordered[ordered.length - 1];
}

function aippFee(score: number | undefined | null): number {
  const s = Number(score ?? 0);
  if (!s) return 0;
  if (s >= 70) return 0;
  if (s >= 50) return 4900;
  if (s >= 30) return 9900;
  return 14900;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPA_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPA_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPA_URL, SUPA_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const svc = createClient(SUPA_URL, SUPA_SVC, { auth: { persistSession: false } });

    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user ?? null;

    const body = (await req.json()) as Input;

    if (
      !body?.trade_primary ||
      !body?.city ||
      !Number.isFinite(body.target_monthly_appointments) ||
      !Number.isFinite(body.average_project_value) ||
      !Number.isFinite(body.monthly_capacity)
    ) {
      return new Response(
        JSON.stringify({ error: "Champs requis manquants pour calculer le devis." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---------- Config ----------
    const { data: cfgRow } = await svc
      .from("pricing_config")
      .select("pricing_version,weights,min_monthly_cents,max_monthly_cents,trial_price_cents,trial_days,default_plan_code")
      .eq("active", true)
      .maybeSingle();

    const w = { ...DEFAULT_WEIGHTS, ...((cfgRow?.weights as any) ?? {}) };
    w.objective_multipliers = {
      ...DEFAULT_WEIGHTS.objective_multipliers,
      ...(((cfgRow?.weights as any)?.objective_multipliers) ?? {}),
    };
    const pricingVersion = cfgRow?.pricing_version ?? "v2026.08-growth";
    const minCents = cfgRow?.min_monthly_cents ?? 4900;
    const maxCents = cfgRow?.max_monthly_cents ?? 149900;

    // ---------- Catalog ----------
    const { data: planRows } = await svc
      .from("plans")
      .select("code,name,monthly_price,appointments_included,tier_rank,stripe_monthly_price_id")
      .eq("audience", "contractor")
      .eq("active", true)
      .order("tier_rank", { ascending: true });

    const plans = (planRows ?? []) as PlanRow[];
    if (!plans.length) {
      return new Response(JSON.stringify({ error: "Catalogue de plans introuvable." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const close =
      body.close_rate_estimate > 1
        ? body.close_rate_estimate / 100
        : body.close_rate_estimate || 0.3;

    const revenuePotential = Math.round(
      body.target_monthly_appointments * close * body.average_project_value,
    );

    // ---------- Market signals (never invented) ----------
    const citySlug = slug(body.city);
    const tradeSlug = slug(body.trade_primary);
    const sources: Record<string, unknown> = {};
    let signalCount = 0;

    let demandFactor = 1.0;
    let competitionFactor = 1.0;

    const { data: md } = await svc
      .from("market_demand")
      .select("total_projects,supply_count,gap_score,pressure_score")
      .ilike("city", body.city)
      .ilike("category", body.trade_primary)
      .maybeSingle();

    if (md) {
      signalCount++;
      sources.market_demand = md;
      const pressure = Number((md as any).pressure_score ?? 0);
      const gap = Number((md as any).gap_score ?? 0);
      if (pressure > 0) {
        demandFactor = clamp(
          1 + (pressure - 50) / 200,
          w.demand_factor_min,
          w.demand_factor_max,
        );
      }
      if (gap !== 0) {
        // High gap (demand >> supply) = less competition pressure on price down.
        competitionFactor = clamp(
          1 + gap / 400,
          w.competition_factor_min,
          w.competition_factor_max,
        );
      }
    }

    const { data: grid } = await svc
      .from("city_service_demand_grid")
      .select("demand_score,supply_score,gap_score")
      .eq("city_slug", citySlug)
      .eq("trade_slug", tradeSlug)
      .maybeSingle();

    if (grid) {
      signalCount++;
      sources.demand_grid = grid;
      const d = Number((grid as any).demand_score ?? 0);
      const s = Number((grid as any).supply_score ?? 0);
      if (d > 0) {
        const ratio = s > 0 ? d / s : 1.2;
        demandFactor = clamp(
          (demandFactor + clamp(ratio, 0.6, 1.8)) / 2,
          w.demand_factor_min,
          w.demand_factor_max,
        );
      }
    }

    // ---------- Territory availability ----------
    let availability: Record<string, unknown> = {};
    let saturated = false;
    try {
      const { data: avail } = await svc.rpc("territory_availability", {
        _trade: tradeSlug,
        _city: body.city,
      });
      if (avail) {
        availability = avail as Record<string, unknown>;
        sources.territory = avail;
        if ((avail as any).status === "verified") signalCount++;
        saturated =
          (avail as any).lock_status === "locked" ||
          Number((avail as any).remaining_slots ?? 1) <= 0;
      }
    } catch (_) {
      availability = { status: "insufficient_data" };
    }

    // ---------- Capacity factor ----------
    const cap = Math.max(1, body.monthly_capacity ?? 1);
    const utilization = clamp(body.target_monthly_appointments / cap, 0, 2);
    const capacityFactor = clamp(
      0.85 + utilization * 0.25,
      w.capacity_factor_min,
      w.capacity_factor_max,
    );

    // ---------- Territory breadth ----------
    const extraCities = Math.max(0, (body.service_cities?.length ?? 1) - 1);
    const territoryMultiplier = clamp(
      1 + extraCities * w.territory_multiplier_per_extra_city,
      1,
      w.territory_multiplier_cap,
    );

    const seasonality = seasonalityFor(body.seasonal_priority, new Date().getMonth());
    const objective = body.business_objective ?? "grow";
    const objectiveMultiplier = w.objective_multipliers[objective] ?? 1.0;

    // ---------- Plan + fees ----------
    const plan = pickPlan(body, plans);
    const base = plan.monthly_price;
    const extraAppointments = Math.max(
      0,
      body.target_monthly_appointments - (plan.appointments_included ?? 0),
    );
    const apptPkg = extraAppointments * w.volume_per_appointment_cents;
    const exclusivity = body.wants_exclusivity
      ? Math.round(base * (w.exclusivity_multiplier - 1))
      : 0;
    const aipp = aippFee(body.current_ai_visibility_score);

    const subtotal = base + apptPkg + exclusivity + aipp;
    // Compounding six factors can double the price; the blended multiplier is
    // clamped so the personalized price stays within a defensible band of the
    // plan's published price.
    const marketMultiplier = round2(
      clamp(
        demandFactor *
          competitionFactor *
          capacityFactor *
          territoryMultiplier *
          seasonality *
          objectiveMultiplier,
        0.85,
        1.35,
      ),
    );

    let finalPrice = clamp(Math.round(subtotal * marketMultiplier), minCents, maxCents);
    let finalPlanCode = plan.code;
    let status: string = "offered";

    if (saturated) {
      status = "waitlisted";
      const entry = plans[0];
      finalPlanCode = entry.code;
      finalPrice = entry.monthly_price;
    }

    // ---------- Data confidence ----------
    const dataStatus =
      signalCount >= 2 ? "verified" : signalCount === 1 ? "declared" : "insufficient";

    const minPrice = Math.round(finalPrice * 0.9);
    const maxPrice = Math.round(finalPrice * 1.12);
    const roiEstimate =
      finalPrice > 0 ? Number((revenuePotential / (finalPrice / 100)).toFixed(2)) : 0;

    const factors = {
      demand_factor: round2(demandFactor),
      competition_factor: round2(competitionFactor),
      capacity_factor: round2(capacityFactor),
      territory_multiplier: round2(territoryMultiplier),
      seasonality_multiplier: round2(seasonality),
      objective_multiplier: round2(objectiveMultiplier),
      market_multiplier: marketMultiplier,
      utilization: round2(utilization),
      extra_appointments: extraAppointments,
      signal_count: signalCount,
      sources,
    };

    const breakdown = {
      base_platform_fee: base,
      appointment_package_fee: apptPkg,
      exclusivity_fee: exclusivity,
      aipp_optimization_fee: aipp,
      subtotal,
      market_multiplier: marketMultiplier,
      final_monthly_price: finalPrice,
      trial: {
        price_cents: cfgRow?.trial_price_cents ?? 100,
        days: cfgRow?.trial_days ?? 7,
      },
      plan: {
        code: finalPlanCode,
        name: plan.name,
        appointments_included: plan.appointments_included ?? 0,
        stripe_monthly_price_id: plan.stripe_monthly_price_id,
      },
    };

    const quotePayload: Record<string, unknown> = {
      user_id: user?.id ?? null,
      contractor_id: body.contractor_id ?? null,
      company_name: body.company_name ?? null,
      trade_primary: body.trade_primary,
      city: body.city,
      service_cities: body.service_cities ?? [body.city],
      business_objective: objective,
      wants_exclusivity: !!body.wants_exclusivity,
      territory_cluster: `${citySlug}::${tradeSlug}`,
      target_monthly_appointments: body.target_monthly_appointments,
      average_project_value: Math.round(body.average_project_value),
      estimated_close_rate: round2(close),
      estimated_monthly_revenue_potential: revenuePotential,
      base_platform_fee: base,
      appointment_package_fee: apptPkg,
      territory_competition_multiplier: round2(
        clamp(demandFactor * competitionFactor, 0.5, 9.99),
      ),
      seasonality_multiplier: round2(seasonality),
      exclusivity_fee: exclusivity,
      aipp_optimization_fee: aipp,
      recommended_plan: finalPlanCode,
      recommended_monthly_price: finalPrice,
      min_monthly_price: minPrice,
      max_monthly_price: maxPrice,
      roi_estimate: Math.min(roiEstimate, 999999),
      pricing_status: status,
      pricing_version: pricingVersion,
      data_status: dataStatus,
      factors,
      availability,
      input_payload: body as unknown as Record<string, unknown>,
      breakdown,
    };

    const { data: saved, error: saveErr } = await svc
      .from("contractor_pricing_quotes")
      .insert(quotePayload)
      .select("id")
      .single();

    if (saveErr) {
      console.error("[compute-pricing-quote] save failed", saveErr);
      return new Response(
        JSON.stringify({ error: "Impossible d'enregistrer votre plan personnalisé." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        quote_id: saved.id,
        pricing_version: pricingVersion,
        data_status: dataStatus,
        recommended_plan: finalPlanCode,
        plan_name: plan.name,
        recommended_monthly_price: finalPrice,
        min_monthly_price: minPrice,
        max_monthly_price: maxPrice,
        estimated_monthly_revenue_potential: revenuePotential,
        roi_estimate: roiEstimate,
        pricing_status: status,
        trial: breakdown.trial,
        availability,
        factors,
        breakdown,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    console.error("[compute-pricing-quote] error", e);
    return new Response(
      JSON.stringify({ error: "Erreur lors du calcul de votre plan." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
