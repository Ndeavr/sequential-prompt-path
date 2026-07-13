/**
 * useFirstDollarFunnel — Aggregates the 11-stage funnel from launch_leads +
 * contractor_funnel_events. Today / 7d / All Time.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FunnelPeriod = "today" | "7d" | "all";

export const FUNNEL_STAGES = [
  { key: "scraped", label: "Scraped Leads" },
  { key: "valid_mobile", label: "Valid Mobile" },
  { key: "sms_sent", label: "SMS Sent" },
  { key: "sms_delivered", label: "Delivered" },
  { key: "clicked", label: "Link Clicked" },
  { key: "landing_viewed", label: "Landing Viewed" },
  { key: "alex_started", label: "Alex Started" },
  { key: "profile_started", label: "Profile Started" },
  { key: "checkout_started", label: "Checkout Started" },
  { key: "payment_success", label: "Payment ✓" },
  { key: "activated", label: "Activated" },
] as const;

export type FunnelStageKey = typeof FUNNEL_STAGES[number]["key"];

function periodStart(period: FunnelPeriod): string | null {
  const now = new Date();
  if (period === "today") {
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (period === "7d") {
    const d = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    return d.toISOString();
  }
  return null;
}

async function fetchCounts(period: FunnelPeriod) {
  const from = periodStart(period);
  const counts: Record<FunnelStageKey, number> = {
    scraped: 0, valid_mobile: 0, sms_sent: 0, sms_delivered: 0, clicked: 0,
    landing_viewed: 0, alex_started: 0, profile_started: 0,
    checkout_started: 0, payment_success: 0, activated: 0,
  };

  // launch_leads — stock counters (leads created in period)
  // For "today" we still count today's newly-scraped leads; other stages are event-based below.
  let q = supabase.from("launch_leads" as any).select("lead_status,phone,created_at").limit(50000);
  if (from) q = q.gte("created_at", from);
  const { data: leads } = await q;
  const arr = (leads ?? []) as any[];
  counts.scraped = arr.length;
  counts.valid_mobile = arr.filter(l => l.phone).length;

  // sms_events_v2 — canonical SMS activity (event_time filtered)
  let smsQ = supabase.from("sms_events_v2" as any).select("status,created_at").limit(100000);
  if (from) smsQ = smsQ.gte("created_at", from);
  const { data: smsEvents } = await smsQ;
  const smsArr = (smsEvents ?? []) as any[];
  counts.sms_sent = smsArr.filter(e => ["sent","delivered"].includes(e.status)).length;
  counts.sms_delivered = smsArr.filter(e => e.status === "delivered").length;

  // contractor_funnel_events — everything downstream, event-time filtered
  let ev = supabase.from("contractor_funnel_events" as any).select("event_type,created_at");
  if (from) ev = ev.gte("created_at", from);
  const { data: events } = await ev.limit(100000);
  const evArr = (events ?? []) as any[];
  const cnt = (t: string) => evArr.filter(e => e.event_type === t).length;
  counts.clicked = cnt("sms_clicked") + cnt("link_clicked");
  counts.landing_viewed = cnt("landing_view") + cnt("landing_viewed") + cnt("landing_viewed_first_dollar");
  counts.alex_started = cnt("alex_started");
  counts.profile_started = cnt("registration_started") + cnt("signup_started") + cnt("profile_started");
  counts.checkout_started = cnt("checkout_started");
  counts.payment_success = cnt("payment_succeeded") + cnt("payment_success");
  counts.activated = cnt("contractor_activated") + cnt("activated");

  // Fallback: if event stream is empty for period, back-fill from launch_leads.lead_status
  // ("all" period without any events would otherwise show 0 downstream)
  if (counts.activated === 0) {
    const passPaid = new Set(["PAID","ACTIVATED"]);
    counts.payment_success = Math.max(counts.payment_success, arr.filter(l => passPaid.has(l.lead_status)).length);
    counts.activated = Math.max(counts.activated, arr.filter(l => l.lead_status === "ACTIVATED").length);
  }

  return counts;
}

export function useFirstDollarFunnel(period: FunnelPeriod) {
  return useQuery({
    queryKey: ["first-dollar-funnel", period],
    queryFn: () => fetchCounts(period),
    refetchInterval: 15_000,
  });
}
