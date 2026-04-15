import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

const PLANS = [
  { code: "pro", name: "Pro", appointments: 5, price: 149 },
  { code: "premium", name: "Premium", appointments: 15, price: 349 },
  { code: "elite", name: "Élite", appointments: 30, price: 599 },
  { code: "signature", name: "Signature", appointments: 50, price: 999 },
  { code: "fondateur", name: "Fondateur", appointments: 100, price: 499 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
    const recommended = fittingPlans.length > 0
      ? fittingPlans[0]
      : plansComparison[plansComparison.length - 1];

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
