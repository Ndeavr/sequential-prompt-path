import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PlanInput {
  target_revenue: number;
  average_job_value: number;
  close_rate: number;
  appointment_capacity: number;
  territory?: string;
  category?: string;
}

interface PlanOutput {
  required_appointments: number;
  recommended_plan: string;
  estimated_revenue: number;
  potential_revenue: number;
  revenue_gap: number;
  plans_comparison: {
    code: string;
    name: string;
    appointments_per_month: number;
    estimated_revenue: number;
    fits_goal: boolean;
    price_monthly: number;
  }[];
}

/**
 * Plan catalog is READ FROM THE DATABASE (`public.plans` +
 * `public.plan_included_appointments`). The previous hardcoded table still
 * carried renamed/legacy tiers and stale prices ($349 / $599 / $999) — that is
 * exactly the class of defect that mis-sold Domination to weak leads.
 */
interface CatalogPlan { code: string; name: string; appointments: number; price: number; rank: number }

async function loadPlans(sb: any): Promise<CatalogPlan[]> {
  const [{ data: plans }, { data: appts }] = await Promise.all([
    sb.from("plans")
      .select("code,name,monthly_price,tier_rank")
      .eq("audience", "contractor").eq("active", true).order("tier_rank"),
    sb.from("plan_included_appointments").select("plan_code,included_appointments_monthly"),
  ]);
  const apptMap = new Map<string, number>(
    (appts ?? []).map((a: any) => [a.plan_code, Number(a.included_appointments_monthly ?? 0)]),
  );
  return (plans ?? []).map((p: any) => ({
    code: p.code,
    name: p.name,
    appointments: apptMap.get(p.code) ?? 0,
    price: Math.round(Number(p.monthly_price ?? 0) / 100),
    rank: Number(p.tier_rank ?? 0),
  })).sort((a: CatalogPlan, b: CatalogPlan) => a.rank - b.rank);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const PLANS = await loadPlans(sb);
    if (PLANS.length === 0) {
      return new Response(JSON.stringify({ error: "Catalogue de plans indisponible", error_code: "plan_catalog_unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const input: PlanInput = await req.json();
    const { target_revenue, average_job_value, close_rate, appointment_capacity } = input;

    if (!target_revenue || !average_job_value || !close_rate) {
      return new Response(
        JSON.stringify({ error: "target_revenue, average_job_value, close_rate required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate required appointments
    const revenuePerAppointment = average_job_value * close_rate;
    const requiredAppointments = Math.ceil(target_revenue / revenuePerAppointment);

    // Find best plan
    const plansComparison = PLANS.map((plan) => {
      const effectiveAppts = Math.min(plan.appointments, appointment_capacity);
      const estimatedRevenue = effectiveAppts * revenuePerAppointment;
      return {
        code: plan.code,
        name: plan.name,
        appointments_per_month: plan.appointments,
        estimated_revenue: Math.round(estimatedRevenue),
        fits_goal: estimatedRevenue >= target_revenue,
        price_monthly: plan.price,
      };
    });

    // Select recommended plan (cheapest that meets goal, or highest if none meets)
    const fittingPlans = plansComparison.filter((p) => p.fits_goal);
    // GUARD: when no plan reaches the stated goal we recommend the plan matching
    // the contractor's real CAPACITY, never automatically the priciest tier.
    const capacityFit = [...plansComparison]
      .filter((p) => p.appointments_per_month <= Math.max(1, appointment_capacity || 0))
      .pop();
    const recommended = fittingPlans.length > 0
      ? fittingPlans[0]
      : (capacityFit ?? plansComparison[Math.min(2, plansComparison.length - 1)]);

    const potentialRevenue = recommended.estimated_revenue;
    const revenueGap = Math.max(0, target_revenue - potentialRevenue);

    const result: PlanOutput = {
      required_appointments: requiredAppointments,
      recommended_plan: recommended.code,
      estimated_revenue: potentialRevenue,
      potential_revenue: potentialRevenue,
      revenue_gap: revenueGap,
      plans_comparison: plansComparison,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
