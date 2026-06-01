// UNPRO — Personalized Contractor Pricing Quote
// Calculates a tailored monthly price based on the contractor's real objectives,
// territory competitiveness and seasonality, then persists it as a quote.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Input {
  trade_primary: string;
  trade_secondary?: string | null;
  city: string;
  service_radius_km?: number;
  target_monthly_appointments: number;
  average_project_value: number; // CAD dollars
  monthly_capacity: number;
  close_rate_estimate: number; // 0..1 or 0..100
  desired_growth_level?: "steady" | "growth" | "aggressive";
  wants_exclusivity?: boolean;
  preferred_project_types?: string[];
  seasonal_priority?: "spring" | "summer" | "fall" | "winter" | "all";
  current_google_presence?: number; // 0..100
  current_ai_visibility_score?: number; // 0..100
  rbq_number?: string | null;
  company_name?: string | null;
  website_url?: string | null;
}

interface PlanRow {
  code: string;
  name: string;
  monthly_price: number; // cents
  appointments_included: number | null;
}

const PLAN_RANK: Record<string, number> = {
  recrue: 0,
  pro: 1,
  premium: 2,
  elite: 3,
  signature: 4,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pickPlan(input: Input): string {
  const cap = input.monthly_capacity ?? 0;
  const tgt = input.target_monthly_appointments ?? 0;
  const apv = input.average_project_value ?? 0;
  const close =
    input.close_rate_estimate > 1
      ? input.close_rate_estimate / 100
      : input.close_rate_estimate;
  const revPotential = tgt * close * apv;

  if (input.wants_exclusivity && cap >= 20) return "signature";
  if (cap < 5 || tgt < 4) return "recrue";
  if (apv >= 25000 && revPotential >= 100000) return "elite";
  if (apv >= 25000) return "premium";
  if (tgt >= 26) return "signature";
  if (tgt >= 16) return "elite";
  if (tgt >= 9) return "premium";
  if (tgt >= 4) return "pro";
  return "recrue";
}

function seasonalityFor(
  priority: string | undefined,
  month: number, // 0..11
): number {
  // QC seasonality, generic curve
  const season =
    month >= 2 && month <= 4
      ? "spring"
      : month >= 5 && month <= 7
        ? "summer"
        : month >= 8 && month <= 10
          ? "fall"
          : "winter";
  if (!priority || priority === "all") {
    // demand-weighted neutral curve
    return season === "summer" ? 1.15 : season === "spring" ? 1.1 : season === "fall" ? 1.0 : 0.95;
  }
  return priority === season ? 1.2 : 0.97;
}

async function territoryMultiplier(
  supa: ReturnType<typeof createClient>,
  city: string,
  trade: string,
): Promise<{ multiplier: number; saturated: boolean; cluster: string }> {
  const cluster = `${(city || "qc").toLowerCase()}::${(trade || "general").toLowerCase()}`;
  try {
    const { data } = await supa
      .from("cluster_pricing_multipliers")
      .select("multiplier, saturation_band")
      .eq("city_slug", (city || "").toLowerCase())
      .eq("trade_slug", (trade || "").toLowerCase())
      .maybeSingle();
    if (data && typeof (data as any).multiplier === "number") {
      const m = clamp((data as any).multiplier, 0.9, 1.6);
      const saturated = (data as any).saturation_band === "saturated";
      return { multiplier: m, saturated, cluster };
    }
  } catch (_) {
    // table shape may differ — fall through to capacity check
  }
  try {
    const { data } = await supa
      .from("contractor_capacity_state")
      .select("saturation_band, demand_index")
      .eq("city", city)
      .eq("trade", trade)
      .maybeSingle();
    if (data) {
      const saturated = (data as any).saturation_band === "saturated";
      const demand = clamp(Number((data as any).demand_index ?? 1), 0.9, 1.6);
      return { multiplier: demand, saturated, cluster };
    }
  } catch (_) {}
  return { multiplier: 1.05, saturated: false, cluster };
}

function aippFee(score: number | undefined | null): number {
  const s = Number(score ?? 0);
  if (s >= 70) return 0;
  if (s >= 50) return 4900;
  if (s >= 30) return 14900;
  return 29900;
}

function appointmentPackageFee(plan: PlanRow, target: number): number {
  const included = plan.appointments_included ?? 0;
  const extra = Math.max(0, target - included);
  return extra * 3500; // $35 per extra appointment, in cents
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
    const svc = createClient(SUPA_URL, SUPA_SVC, {
      auth: { persistSession: false },
    });

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

    const close =
      body.close_rate_estimate > 1
        ? body.close_rate_estimate / 100
        : body.close_rate_estimate || 0.3;

    const revenuePotential = Math.round(
      body.target_monthly_appointments * close * body.average_project_value,
    );

    // Pick plan
    const recommendedPlanCode = pickPlan(body);
    const { data: plans } = await svc
      .from("plan_catalog")
      .select("code,name,monthly_price,appointments_included")
      .in("code", Object.keys(PLAN_RANK));
    const planMap = new Map<string, PlanRow>(
      (plans ?? []).map((p: any) => [p.code, p as PlanRow]),
    );
    const plan = planMap.get(recommendedPlanCode) ?? planMap.get("pro")!;
    if (!plan) {
      return new Response(JSON.stringify({ error: "Catalogue de plans introuvable." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Territory + seasonality
    const territory = await territoryMultiplier(svc, body.city, body.trade_primary);
    const seasonality = seasonalityFor(
      body.seasonal_priority,
      new Date().getMonth(),
    );

    // Fees (cents)
    const base = plan.monthly_price;
    const apptPkg = appointmentPackageFee(plan, body.target_monthly_appointments);
    const exclusivity = body.wants_exclusivity ? Math.round(base * 0.3) : 0;
    const aipp = aippFee(body.current_ai_visibility_score);

    const subtotal = base + apptPkg + exclusivity + aipp;
    const adjusted = Math.round(
      subtotal * territory.multiplier * seasonality,
    );

    let status: string = "offered";
    let finalPlanCode = recommendedPlanCode;
    let finalPrice = adjusted;

    if (territory.saturated) {
      status = "waitlisted";
      finalPlanCode = "recrue";
      const recrue = planMap.get("recrue");
      finalPrice = recrue?.monthly_price ?? 14900;
    }

    const minPrice = Math.round(finalPrice * 0.85);
    const maxPrice = Math.round(finalPrice * 1.15);
    const roi = finalPrice > 0 ? Number((revenuePotential * 100 / (finalPrice / 100)).toFixed(2)) / 100 : 0;
    // roi_estimate = revenue (dollars) / price (dollars)
    const roiEstimate = finalPrice > 0 ? Number((revenuePotential / (finalPrice / 100)).toFixed(2)) : 0;

    const breakdown = {
      base_platform_fee: base,
      appointment_package_fee: apptPkg,
      exclusivity_fee: exclusivity,
      aipp_optimization_fee: aipp,
      subtotal_before_multipliers: subtotal,
      territory_competition_multiplier: territory.multiplier,
      seasonality_multiplier: seasonality,
      adjusted_total: adjusted,
      currency: "CAD",
      unit: "cents",
      computed_at: new Date().toISOString(),
    };

    const insertRow = {
      user_id: user?.id ?? null,
      company_name: body.company_name ?? null,
      trade_primary: body.trade_primary,
      city: body.city,
      territory_cluster: territory.cluster,
      target_monthly_appointments: body.target_monthly_appointments,
      average_project_value: Math.round(body.average_project_value),
      estimated_close_rate: Number(close.toFixed(2)),
      estimated_monthly_revenue_potential: revenuePotential,
      base_platform_fee: base,
      appointment_package_fee: apptPkg,
      territory_competition_multiplier: Number(territory.multiplier.toFixed(2)),
      seasonality_multiplier: Number(seasonality.toFixed(2)),
      exclusivity_fee: exclusivity,
      aipp_optimization_fee: aipp,
      recommended_plan: finalPlanCode,
      recommended_monthly_price: finalPrice,
      min_monthly_price: minPrice,
      max_monthly_price: maxPrice,
      roi_estimate: roiEstimate,
      pricing_status: status,
      input_payload: body,
      breakdown,
    };

    const { data: inserted, error } = await svc
      .from("contractor_pricing_quotes")
      .insert(insertRow)
      .select("*")
      .single();

    if (error) {
      console.error("[compute-pricing-quote] insert error", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ quote: inserted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[compute-pricing-quote] unexpected", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
