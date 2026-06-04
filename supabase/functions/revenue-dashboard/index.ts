/**
 * revenue-dashboard — KPI snapshot for the autonomous engine cockpit.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FUNNEL_STATUSES = [
  "Discovered", "Enriched", "Scored", "Messaged", "Delivered",
  "Opened", "Replied", "Qualified", "CheckoutSent", "Paid", "Activated",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const startToday = new Date(); startToday.setUTCHours(0, 0, 0, 0);
  const startMtd = new Date(); startMtd.setUTCDate(1); startMtd.setUTCHours(0, 0, 0, 0);

  // Revenue (paid activations)
  const { data: paidToday } = await sb.from("activation_sessions")
    .select("amount_paid_cents").eq("status", "paid").gte("paid_at", startToday.toISOString());
  const { data: paidMtd } = await sb.from("activation_sessions")
    .select("amount_paid_cents").eq("status", "paid").gte("paid_at", startMtd.toISOString());

  const sumCents = (rows: any[] | null) => (rows ?? []).reduce((a, r) => a + (r.amount_paid_cents ?? 0), 0);

  const { count: activated } = await sb.from("activation_sessions")
    .select("*", { count: "exact", head: true }).eq("status", "paid");
  const { count: checkoutSent } = await sb.from("activation_sessions")
    .select("*", { count: "exact", head: true }).neq("checkout_url", null);
  const { count: pending } = await sb.from("activation_sessions")
    .select("*", { count: "exact", head: true }).eq("status", "checkout_sent");
  const { count: replied } = await sb.from("outreach_replies")
    .select("*", { count: "exact", head: true });

  const conversion = (replied ?? 0) > 0 ? Math.round(((activated ?? 0) / (replied ?? 1)) * 1000) / 10 : 0;

  // Funnel counts
  const funnel: Record<string, number> = {};
  for (const s of FUNNEL_STATUSES) {
    const { count } = await sb.from("contractor_leads")
      .select("*", { count: "exact", head: true }).eq("pipeline_status", s);
    funnel[s] = count ?? 0;
  }

  return new Response(JSON.stringify({
    revenue_today_cents: sumCents(paidToday),
    revenue_mtd_cents: sumCents(paidMtd),
    activated_contractors: activated ?? 0,
    pending_payments: pending ?? 0,
    checkout_links_sent: checkoutSent ?? 0,
    replied: replied ?? 0,
    conversion_pct: conversion,
    funnel,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
