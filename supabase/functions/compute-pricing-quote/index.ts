// UNPRO — Personalized Contractor Pricing Quote (v2026.08-growth / pricing_v3)
// Deterministic, server-side pricing engine. SINGLE canonical engine.
// Single source of truth: public.pricing_config (weights) + public.plans (catalog)
// Market factors: public.market_demand, public.city_service_demand_grid,
//                 public.territory_availability(trade, city)
// Capacity truth: public.market_capacity + public.market_capacity_commitments
// Appointment value: public.appointment_values (configurable, provenance-tagged)
// Never invents market data: when signals are missing, factors stay neutral (1.00)
// and data_status downgrades to "declared" or "insufficient".
// Never displays scarcity that is not proven by real remaining positions.


import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  evaluateMargin,
  marginConfigFrom,
  solveBudget,
  solvePack,
  PACK_350_TOTAL_CENTS,
  PACK_350_MAX_APPOINTMENTS,
  PACK_350_DURATION_MONTHS,
  type ModeOutcome,
  type PricingMode,
} from "../_shared/pricingModes.ts";

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
  /** "goal" = appointments in → budget out. "budget" = budget in → guarantee out. */
  pricing_mode?: PricingMode;
  /** Required when pricing_mode = "budget" (CAD cents). */
  monthly_budget_cents?: number;
  /** Required when pricing_mode = "pack" — one-time amount (CAD cents). */
  total_price_cents?: number;
  /** Delivery window of the pack guarantee (months). */
  guarantee_duration_months?: number;
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
  /** Growth calculator context (persisted, never invented). */
  annual_revenue?: number; // CAD dollars
  gross_margin_percent?: number; // 0..100
  growth_mode?: "percent" | "amount";
  growth_value?: number;
  billing_interval?: "month" | "year";
  source?: string;
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
/**
 * Plan selection — CAPACITY FIRST, then at most ONE tier of uplift for
 * exclusivity / domination objectives.
 *
 * GUARD: an objective alone can never jump a contractor to the most expensive
 * plan. Only a contractor whose real appointment demand already reaches the
 * top tier (or is one tier below it) can be offered the top tier. This is the
 * defect that offered Domination ($1,499/mo) to an 8-appointment contractor.
 */
function pickPlan(
  input: Input,
  plans: PlanRow[],
  capacityCeiling: number | null,
): { plan: PlanRow; capped: boolean } {
  const ordered = [...plans].sort((a, b) => a.tier_rank - b.tier_rank);
  const target = Math.max(0, input.target_monthly_appointments ?? 0);
  const objective = input.business_objective ?? "grow";

  if (objective === "visibility" && target <= 1) return { plan: ordered[0], capped: false };

  // Smallest plan whose included appointments cover the real target.
  const fitIndex = ordered.findIndex((p) => (p.appointments_included ?? 0) >= target);
  let index = fitIndex >= 0 ? fitIndex : ordered.length - 1;

  const wantsTopEnd =
    input.wants_exclusivity || objective === "exclusivity" || objective === "dominate";
  if (wantsTopEnd) index = Math.min(index + 1, ordered.length - 1);

  // Hard cap: no automatic jump to the priciest plan on objective alone.
  if (index === ordered.length - 1 && fitIndex >= 0 && fitIndex < ordered.length - 2) {
    index = ordered.length - 2;
  }

  // CAPACITY GUARD — never sell guaranteed appointments beyond what the market
  // can actually deliver. Downgrade to the richest plan the market supports.
  let capped = false;
  if (capacityCeiling !== null) {
    while (
      index > 0 &&
      (ordered[index].appointments_included ?? 0) > capacityCeiling
    ) {
      index--;
      capped = true;
    }
    if ((ordered[index].appointments_included ?? 0) > capacityCeiling) capped = true;
  }
  return { plan: ordered[index], capped };
}


function aippFee(score: number | undefined | null): number {
  const s = Number(score ?? 0);
  if (!s) return 0;
  if (s >= 70) return 0;
  if (s >= 50) return 4900;
  if (s >= 30) return 9900;
  return 14900;
}

/**
 * Price of ONE extra exclusive appointment for THIS contractor.
 * It is the market value of an appointment in this contractor's economics —
 * NEVER `plan price ÷ included appointments`.
 *
 * value = average project value × close rate × configured appointment share.
 * Provenance is always reported: configured | inferred | calculated | unavailable.
 */
async function computeExtraAppointmentPrice(
  svc: any,
  body: Input,
  close: number,
  w: any,
): Promise<{ price_cents: number | null; status: string; basis: Record<string, unknown> }> {
  const share = Number(w.appointment_value_share ?? 0.08);
  const minCents = Number(w.extra_appointment_min_cents ?? 4900);
  const maxCents = Number(w.extra_appointment_max_cents ?? 99900);

  let projectValue = Number(body.average_project_value ?? 0);
  let status = "calculated";
  const basis: Record<string, unknown> = { share, close_rate: round2(close) };

  const { data: bands, error } = await svc
    .from("appointment_values")
    .select("project_size,label_fr,estimated_value_min,estimated_value_max,conversion_rate,value_status")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    basis.appointment_values_error = error.message;
  } else if (Array.isArray(bands) && bands.length) {
    const band = bands.find(
      (b: any) =>
        projectValue >= Number(b.estimated_value_min ?? 0) &&
        projectValue <= Number(b.estimated_value_max ?? 0),
    );
    if (band) {
      status = band.value_status ?? "configured";
      basis.band = { size: band.project_size, label: band.label_fr };
    } else if (!projectValue) {
      // No declared project value: fall back to the configured mid band.
      const mid = bands[Math.floor(bands.length / 2)];
      projectValue =
        (Number(mid.estimated_value_min ?? 0) + Number(mid.estimated_value_max ?? 0)) / 2;
      status = "inferred";
      basis.band = { size: mid.project_size, label: mid.label_fr, inferred: true };
    }
  }

  if (!projectValue || !Number.isFinite(projectValue)) {
    return { price_cents: null, status: "unavailable", basis };
  }

  const raw = Math.round(projectValue * close * share * 100);
  const price = clamp(raw, minCents, maxCents);
  basis.raw_cents = raw;
  basis.clamped = raw !== price;
  basis.project_value = Math.round(projectValue);
  return { price_cents: price, status, basis };
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
      !Number.isFinite(
        body.pricing_mode === "budget"
          ? (body.monthly_budget_cents ?? NaN)
          : body.pricing_mode === "pack"
            ? (body.total_price_cents ?? NaN)
            : body.target_monthly_appointments,
      ) ||
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

    // ---------- Growth settings (profile fee, annual discount, caps) ----------
    const { data: growthCfg } = await svc
      .from("pricing_growth_settings")
      .select(
        "profile_fee_cents,annual_months_charged,guaranteed_appointments_cap,entry_pack_total_cents,entry_pack_duration_months,default_close_rate",
      )
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const profileFeeCents = Math.max(0, Math.round(Number(growthCfg?.profile_fee_cents ?? 35000)));
    const annualMonthsCharged = Math.max(1, Number(growthCfg?.annual_months_charged ?? 10));
    const entryPackTotalCents = Math.max(
      0,
      Math.round(Number(growthCfg?.entry_pack_total_cents ?? PACK_350_TOTAL_CENTS)),
    );
    const entryPackDurationMonths = Math.max(
      1,
      Math.round(Number(growthCfg?.entry_pack_duration_months ?? PACK_350_DURATION_MONTHS)),
    );
    const guaranteeCap = Math.max(
      1,
      Math.round(Number(growthCfg?.guaranteed_appointments_cap ?? PACK_350_MAX_APPOINTMENTS)),
    );


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

    const declaredRevenuePotential = Math.round(
      (body.target_monthly_appointments ?? 0) * close * body.average_project_value,
    );

    // ---------- Market signals (never invented) ----------
    const citySlug = slug(body.city);
    const tradeSlug = slug(body.trade_primary);
    const sources: Record<string, unknown> = {};
    // Signal read failures must be visible, not swallowed. Every missing signal
    // is reported so the quote's confidence can be judged.
    const signalErrors: Record<string, string> = {};
    let signalCount = 0;

    let demandFactor = 1.0;
    let competitionFactor = 1.0;

    const { data: md, error: mdErr } = await svc
      .from("market_demand")
      .select("total_projects,supply_count,gap_score,pressure_score")
      .ilike("city", body.city)
      .ilike("category", body.trade_primary)
      .maybeSingle();
    if (mdErr) {
      signalErrors.market_demand = mdErr.message;
      console.error("[compute-pricing-quote] market_demand read failed:", mdErr.message);
    }

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

    const { data: grid, error: gridErr } = await svc
      .from("city_service_demand_grid")
      .select("demand_score,supply_score,gap_score")
      .eq("city_slug", citySlug)
      .eq("trade_slug", tradeSlug)
      .maybeSingle();
    if (gridErr) {
      signalErrors.city_service_demand_grid = gridErr.message;
      console.error("[compute-pricing-quote] demand grid read failed:", gridErr.message);
    }

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

    // ---------- Cluster pricing multiplier (city::trade) ----------
    // Canonical column is `value_multiplier` (NOT `multiplier`).
    let clusterMultiplier = 1.0;
    const clusterKey = `${citySlug}::${tradeSlug}`;
    const { data: clusterRow, error: clusterErr } = await svc
      .from("cluster_pricing_multipliers")
      .select("cluster_key,cluster_value_tier,value_multiplier,scarcity_override_multiplier,demand_score")
      .eq("cluster_key", clusterKey)
      .eq("is_active", true)
      .maybeSingle();
    if (clusterErr) {
      signalErrors.cluster_pricing_multipliers = clusterErr.message;
      console.error("[compute-pricing-quote] cluster multiplier read failed:", clusterErr.message);
    } else if (clusterRow) {
      signalCount++;
      sources.cluster_pricing = clusterRow;
      const raw = Number(
        (clusterRow as any).scarcity_override_multiplier ??
          (clusterRow as any).value_multiplier ??
          1,
      );
      if (Number.isFinite(raw) && raw > 0) clusterMultiplier = clamp(raw, 0.8, 1.5);
    } else {
      sources.cluster_pricing = { status: "no_row", cluster_key: clusterKey };
    }

    // ---------- Territory availability + scarcity ----------
    let availability: Record<string, unknown> = {};
    let saturated = false;
    // Neutral until real configured capacity is found (never invent scarcity).
    let scarcityMultiplier = 1.0;
    try {
      const { data: avail } = await svc.rpc("territory_availability", {
        _trade: tradeSlug,
        _city: body.city,
      });
      if (avail) {
        availability = avail as Record<string, unknown>;
        sources.territory = avail;
        if ((avail as any).status === "verified") {
          signalCount++;
          const raw = Number((avail as any).scarcity_multiplier ?? 1);
          if (Number.isFinite(raw) && raw > 0) scarcityMultiplier = clamp(raw, 1, 1.35);
        }
        saturated =
          (avail as any).lock_status === "locked" ||
          Number((avail as any).remaining_slots ?? 1) <= 0;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      signalErrors.territory_availability = msg;
      console.error("[compute-pricing-quote] territory_availability rpc failed:", msg);
      availability = { status: "insufficient_data", error: msg };
    }

    // ---------- Market capacity (service x city) — inventory truth ----------
    // No guaranteed appointment is ever sold beyond real market capacity, and
    // no scarcity is displayed unless remaining positions prove it.
    let capacityAvailability: Record<string, unknown> = {
      status: "unknown",
      market_open: true,
      remaining_positions: null,
      capacity_status: null,
      appointment_ceiling: null,
    };
    let capacityCeiling: number | null = null;
    let marketClosed = false;

    const { data: mc, error: mcErr } = await svc
      .from("market_capacity")
      .select(
        "service_slug,city_slug,max_contractors,active_contractors,committed_appointments,estimated_monthly_demand,remaining_positions,capacity_score,capacity_status,market_open",
      )
      .eq("service_slug", tradeSlug)
      .eq("city_slug", citySlug)
      .maybeSingle();
    if (mcErr) {
      signalErrors.market_capacity = mcErr.message;
      console.error("[compute-pricing-quote] market_capacity read failed:", mcErr.message);
    } else if (mc) {
      signalCount++;
      sources.market_capacity = mc;
      const remaining = Number((mc as any).remaining_positions ?? 0);
      const open = (mc as any).market_open === true && remaining > 0;
      marketClosed = !open;
      // Demand actually available to a new contractor this month.
      const demand = Number((mc as any).estimated_monthly_demand ?? 0);
      const committed = Number((mc as any).committed_appointments ?? 0);
      capacityCeiling = demand > 0 ? Math.max(0, demand - committed) : null;
      capacityAvailability = {
        status: "verified",
        market_open: open,
        remaining_positions: remaining,
        max_contractors: Number((mc as any).max_contractors ?? 0),
        active_contractors: Number((mc as any).active_contractors ?? 0),
        committed_appointments: committed,
        estimated_monthly_demand: demand > 0 ? demand : null,
        capacity_status: (mc as any).capacity_status ?? null,
        capacity_score: Number((mc as any).capacity_score ?? 0),
        appointment_ceiling: capacityCeiling,
      };
    } else {
      capacityAvailability = {
        status: "not_configured",
        market_open: true,
        remaining_positions: null,
        capacity_status: null,
        appointment_ceiling: null,
        service_slug: tradeSlug,
        city_slug: citySlug,
      };
    }

    // ---------- Exclusivity inventory ----------
    let exclusivityAvailability: Record<string, unknown> = { status: "unknown" };
    if (body.wants_exclusivity) {
      const { data: exclusiveHeld, error: exErr } = await svc
        .from("market_capacity_commitments")
        .select("id,contractor_id")
        .eq("service_slug", tradeSlug)
        .eq("city_slug", citySlug)
        .eq("exclusive", true)
        .eq("status", "active")
        .maybeSingle();
      if (exErr) {
        signalErrors.exclusivity = exErr.message;
        exclusivityAvailability = { status: "unknown", error: exErr.message };
      } else if (exclusiveHeld) {
        exclusivityAvailability = {
          status: "taken",
          held_by_self: exclusiveHeld.contractor_id === (body.contractor_id ?? null),
        };
      } else {
        exclusivityAvailability = { status: "available" };
      }
    } else {
      exclusivityAvailability = { status: "not_requested" };
    }
    const exclusivityGranted =
      !!body.wants_exclusivity &&
      (exclusivityAvailability as any).status === "available" &&
      !marketClosed;

    // (capacity factor is computed per appointment target inside priceChain)



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

    // ---------- Extra appointment price (market value, never plan ÷ included) ----------
    const extra = await computeExtraAppointmentPrice(svc, body, close, w);
    const aipp = aippFee(body.current_ai_visibility_score);

    /**
     * THE canonical price chain, expressed as a pure function of the appointment
     * target. Both pricing modes (goal / budget) resolve THIS function — there is
     * no second formula anywhere.
     */
    function priceChain(target: number) {
      const t = Math.max(0, Math.round(target));
      const picked = pickPlan({ ...body, target_monthly_appointments: t }, plans, capacityCeiling);
      const p = picked.plan;
      const base = p.monthly_price;

      const extraAppointments = Math.max(0, t - (p.appointments_included ?? 0));
      const apptPkg = extra.price_cents
        ? extraAppointments * extra.price_cents
        : extraAppointments * w.volume_per_appointment_cents;

      // Exclusivity is only charged when the inventory can actually grant it.
      const exclusivity = exclusivityGranted
        ? Math.round(base * (w.exclusivity_multiplier - 1))
        : 0;

      const utilizationT = clamp(t / Math.max(1, body.monthly_capacity ?? 1), 0, 2);
      const capacityFactorT = clamp(
        0.85 + utilizationT * 0.25,
        w.capacity_factor_min,
        w.capacity_factor_max,
      );

      const subtotal = base + apptPkg + exclusivity + aipp;
      // Compounding six factors can double the price; the blended multiplier is
      // clamped so the personalized price stays within a defensible band of the
      // plan's published price.
      const marketMultiplier = round2(
        clamp(
          demandFactor *
            competitionFactor *
            capacityFactorT *
            territoryMultiplier *
            seasonality *
            objectiveMultiplier *
            clusterMultiplier *
            scarcityMultiplier,
          0.85,
          1.45,
        ),
      );

      return {
        target: t,
        plan: p,
        plan_code: p.code,
        capacity_capped: picked.capped,
        base,
        appointment_package_fee: apptPkg,
        exclusivity_fee: exclusivity,
        aipp_fee: aipp,
        subtotal,
        market_multiplier: marketMultiplier,
        monthly_price_cents: clamp(Math.round(subtotal * marketMultiplier), minCents, maxCents),
      };
    }

    // ---------- Mode resolution (goal ⇄ budget, same chain) ----------
    const marginCfg = marginConfigFrom((cfgRow?.weights as any) ?? {});
    const pricingMode: PricingMode =
      body.pricing_mode === "budget"
        ? "budget"
        : body.pricing_mode === "pack"
          ? "pack"
          : "goal";
    const packTotalCents =
      pricingMode === "pack"
        ? Math.max(0, Math.round(Number(body.total_price_cents ?? PACK_350_TOTAL_CENTS)))
        : null;
    const packDurationMonths =
      pricingMode === "pack"
        ? Math.max(1, Math.round(Number(body.guarantee_duration_months ?? PACK_350_DURATION_MONTHS)))
        : null;
    const offerKind =
      pricingMode === "pack" && (packTotalCents ?? 0) <= PACK_350_TOTAL_CENTS
        ? "pack_350"
        : pricingMode === "pack"
          ? "pack"
          : "subscription";
    const monthlyBudgetCents =
      pricingMode === "budget"
        ? Math.max(0, Math.round(Number(body.monthly_budget_cents ?? 0)))
        : null;

    let effectiveTarget = Math.max(0, Math.round(body.target_monthly_appointments ?? 0));
    let modeOutcome: ModeOutcome = "goal_resolved";
    let budgetSolve: Record<string, unknown> | null = null;

    let packSolve: Record<string, unknown> | null = null;

    if (pricingMode === "pack") {
      const solved = solvePack(
        {
          total_price_cents: packTotalCents ?? PACK_350_TOTAL_CENTS,
          duration_months: packDurationMonths ?? PACK_350_DURATION_MONTHS,
          market_ceiling: capacityCeiling,
          contractor_capacity: Math.max(0, Math.round(body.monthly_capacity ?? 0)),
          market_unavailable: saturated || marketClosed,
          margin: marginCfg,
        },
        (t) => {
          const c = priceChain(t);
          return {
            target: c.target,
            plan_code: c.plan_code,
            monthly_price_cents: c.monthly_price_cents,
            capacity_capped: c.capacity_capped,
          };
        },
      );
      modeOutcome = solved.outcome;
      effectiveTarget = solved.guaranteed_appointments;
      packSolve = {
        total_price_cents: solved.total_price_cents,
        duration_months: solved.duration_months,
        guaranteed_appointments: solved.guaranteed_appointments,
        resolved_before_cap: solved.resolved_before_cap,
        capped_by_offer: solved.capped_by_offer,
        offer_max_appointments: solved.offer_max_appointments,
        market_ceiling: solved.market_ceiling,
        contractor_capacity: solved.contractor_capacity,
        margin_ok: solved.margin?.meets_minimum ?? false,
        outcome: solved.outcome,
      };
    } else if (pricingMode === "budget") {
      const solved = solveBudget(
        {
          monthly_budget_cents: monthlyBudgetCents ?? 0,
          market_ceiling: capacityCeiling,
          contractor_capacity: Math.max(0, Math.round(body.monthly_capacity ?? 0)),
          market_unavailable: saturated || marketClosed,
          margin: marginCfg,
        },
        (t) => {
          const c = priceChain(t);
          return {
            target: c.target,
            plan_code: c.plan_code,
            monthly_price_cents: c.monthly_price_cents,
            capacity_capped: c.capacity_capped,
          };
        },
      );
      modeOutcome = solved.outcome;
      effectiveTarget = solved.guaranteed_appointments;
      budgetSolve = {
        monthly_budget_cents: monthlyBudgetCents,
        guaranteed_appointments: solved.guaranteed_appointments,
        budget_affordable_appointments: solved.budget_affordable_appointments,
        market_ceiling: solved.market_ceiling,
        contractor_capacity: solved.contractor_capacity,
        unused_budget_cents: solved.unused_budget_cents,
        margin_ok: solved.margin?.meets_minimum ?? false,
        outcome: solved.outcome,
      };
    } else if (saturated || marketClosed) {
      modeOutcome = "market_unavailable";
    } else if (capacityCeiling !== null && effectiveTarget > capacityCeiling) {
      modeOutcome = "capacity_limited";
    }

    // ---------- Final price for the resolved target ----------
    const chain = priceChain(effectiveTarget);
    const plan = chain.plan;
    const capacityCapped = chain.capacity_capped;
    const base = chain.base;
    const apptPkg = chain.appointment_package_fee;
    const exclusivity = chain.exclusivity_fee;
    const subtotal = chain.subtotal;
    const marketMultiplier = chain.market_multiplier;
    const extraAppointments = Math.max(0, effectiveTarget - (plan.appointments_included ?? 0));
    const utilization = clamp(effectiveTarget / Math.max(1, body.monthly_capacity ?? 1), 0, 2);
    const capacityFactor = clamp(
      0.85 + utilization * 0.25,
      w.capacity_factor_min,
      w.capacity_factor_max,
    );

    let finalPrice = chain.monthly_price_cents;
    let finalPlanCode = plan.code;
    let status: string = "offered";

    // Market saturated OR no remaining position: never sell guaranteed capacity.
    if (saturated || marketClosed) {
      status = "waitlisted";
      const entry = plans[0];
      finalPlanCode = entry.code;
      finalPrice = entry.monthly_price;
    }

    // Pack mode: the contractor pays the fixed one-time amount, never the
    // monthly chain price. The chain only resolves HOW MANY appointments the
    // amount can really guarantee.
    if (pricingMode === "pack") {
      finalPrice = packTotalCents ?? PACK_350_TOTAL_CENTS;
      if (modeOutcome === "analysis_required" || modeOutcome === "budget_below_floor") {
        status = "analysis_required";
      } else if (status !== "waitlisted") {
        status = "offered";
      }
    }

    // Budget mode with no guaranteeable appointment: fall back to the entry plan
    // (Présence) and never display an invented guarantee.
    if (pricingMode === "budget" && modeOutcome === "budget_below_floor" && status !== "waitlisted") {
      const entry = plans[0];
      finalPlanCode = entry.code;
      finalPrice = entry.monthly_price;
      status = "offered";
    }

    const guaranteedAppointments =
      status === "waitlisted" ||
      status === "analysis_required" ||
      modeOutcome === "analysis_required" ||
      modeOutcome === "budget_below_floor"
        ? 0
        : pricingMode === "pack"
          ? effectiveTarget
          : pricingMode === "budget"
          ? effectiveTarget
          : Math.min(
              effectiveTarget,
              capacityCeiling ?? effectiveTarget,
              plan.appointments_included ?? effectiveTarget,
            );

    const marginEval = evaluateMargin(finalPrice, guaranteedAppointments, marginCfg);

    // Revenue potential always reflects what is REALLY guaranteed (budget mode)
    // or what the contractor declared targeting (goal mode).
    const revenuePotential =
      pricingMode === "budget" || pricingMode === "pack"
        ? Math.round(guaranteedAppointments * close * body.average_project_value)
        : declaredRevenuePotential;



    // ---------- Data confidence ----------
    const dataStatus =
      signalCount >= 2 ? "verified" : signalCount === 1 ? "declared" : "insufficient";

    const minPrice = Math.round(finalPrice * 0.9);
    const maxPrice = Math.round(finalPrice * 1.12);
    const roiEstimate =
      finalPrice > 0 ? Number((revenuePotential / (finalPrice / 100)).toFixed(2)) : 0;

    // Scarcity is exposed as a first-class factor (v2).
    const factors = {
      demand_factor: round2(demandFactor),
      competition_factor: round2(competitionFactor),
      capacity_factor: round2(capacityFactor),
      territory_multiplier: round2(territoryMultiplier),
      seasonality_multiplier: round2(seasonality),
      objective_multiplier: round2(objectiveMultiplier),
      cluster_multiplier: round2(clusterMultiplier),
      scarcity_multiplier: round2(scarcityMultiplier),
      scarcity_level: (availability as any)?.scarcity_level ?? "unknown",
      remaining_slots: (availability as any)?.remaining_slots ?? null,
      market_multiplier: marketMultiplier,

      utilization: round2(utilization),
      extra_appointments: extraAppointments,
      signal_count: signalCount,
      sources,
      signal_errors: signalErrors,
      degraded: Object.keys(signalErrors).length > 0,
    };

    const CALCULATION_VERSION = "pricing_v3.capacity";

    const breakdown = {
      base_platform_fee: base,
      appointment_package_fee: apptPkg,
      exclusivity_fee: exclusivity,
      aipp_optimization_fee: aipp,
      subtotal,
      market_multiplier: marketMultiplier,
      final_monthly_price: finalPrice,
      extra_appointment_price: extra.price_cents,
      extra_appointment_status: extra.status,
      extra_appointment_basis: extra.basis,
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

    // Human-readable, evidence-only explanation (no invented scarcity).
    const pricingExplanation = {
      calculation_version: CALCULATION_VERSION,
      pricing_mode: pricingMode,
      mode_outcome: modeOutcome,
      monthly_budget_cents: monthlyBudgetCents,
      guaranteed_appointments: guaranteedAppointments,
      budget_solve: budgetSolve,
      offer_kind: offerKind,
      pack_solve: packSolve,
      offer_max_appointments:
        pricingMode === "pack" && (packTotalCents ?? 0) <= PACK_350_TOTAL_CENTS
          ? PACK_350_MAX_APPOINTMENTS
          : null,
      margin: {
        meets_minimum: marginEval.meets_minimum,
        meets_target: marginEval.meets_target,
        margin_ratio: marginEval.margin_ratio,
      },
      plan_reason: capacityCapped
        ? "capacity_capped"
        : status === "waitlisted"
          ? "market_unavailable"
          : "objective_and_volume_fit",
      capacity_capped: capacityCapped,
      market_status: (capacityAvailability as any).capacity_status ?? "unknown",
      remaining_positions: (capacityAvailability as any).remaining_positions ?? null,
      scarcity_provable:
        (capacityAvailability as any).status === "verified" &&
        Number((capacityAvailability as any).remaining_positions ?? 0) > 0 &&
        Number((capacityAvailability as any).remaining_positions ?? 0) <= 3,
      extra_appointment: {
        price_cents: extra.price_cents,
        status: extra.status,
      },
      exclusivity: exclusivityAvailability,
      data_status: dataStatus,
      degraded: Object.keys(signalErrors).length > 0,
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
      pricing_mode: pricingMode,
      offer_kind: offerKind,
      total_price_cents: pricingMode === "pack" ? finalPrice : null,
      guarantee_duration_months: packDurationMonths,
      monthly_budget: monthlyBudgetCents,
      guaranteed_appointments: guaranteedAppointments,
      contractor_capacity: Math.max(0, Math.round(body.monthly_capacity ?? 0)),
      market_capacity_snapshot: capacityAvailability,
      target_monthly_appointments:
        pricingMode === "budget" ? effectiveTarget : body.target_monthly_appointments,
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
      capacity_availability: capacityAvailability,
      exclusivity_availability: exclusivityAvailability,
      pricing_explanation: pricingExplanation,
      calculation_version: CALCULATION_VERSION,
      extra_appointment_price: extra.price_cents,
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
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

    await svc.from("pricing_audit_log").insert({
      event_type:
        pricingMode === "pack"
          ? "pack_quote_computed"
          : pricingMode === "budget"
            ? "budget_quote_computed"
            : "quote_computed",
      actor_id: user?.id ?? null,
      actor_role: user ? "contractor" : "guest",
      contractor_id: body.contractor_id ?? null,
      quote_id: saved.id,
      service_slug: tradeSlug,
      city_slug: citySlug,
      new_state: {
        pricing_mode: pricingMode,
        mode_outcome: modeOutcome,
        monthly_budget_cents: monthlyBudgetCents,
        guaranteed_appointments: guaranteedAppointments,
        plan: finalPlanCode,
        price_cents: finalPrice,
        status,
        capacity: capacityAvailability,
        extra_appointment_price: extra.price_cents,
      },
      reason: pricingExplanation.plan_reason,
      calculation_version: CALCULATION_VERSION,
    });

    return new Response(
      JSON.stringify({
        quote_id: saved.id,
        pricing_version: pricingVersion,
        calculation_version: CALCULATION_VERSION,
        data_status: dataStatus,
        pricing_mode: pricingMode,
        offer_kind: offerKind,
        mode_outcome: modeOutcome,
        total_price_cents: pricingMode === "pack" ? finalPrice : null,
        guarantee_duration_months: packDurationMonths,
        offer_max_appointments:
          pricingMode === "pack" && (packTotalCents ?? 0) <= PACK_350_TOTAL_CENTS
            ? PACK_350_MAX_APPOINTMENTS
            : null,
        pack_solve: packSolve,
        monthly_budget: monthlyBudgetCents,
        guaranteed_appointments: guaranteedAppointments,
        contractor_capacity: Math.max(0, Math.round(body.monthly_capacity ?? 0)),
        budget_solve: budgetSolve,
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
        capacity_availability: capacityAvailability,
        exclusivity_availability: exclusivityAvailability,
        pricing_explanation: pricingExplanation,
        extra_appointment_price: extra.price_cents,
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
