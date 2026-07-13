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

  // launch_leads
  let q = supabase.from("launch_leads" as any).select("lead_status,phone", { count: "exact" });
  if (from) q = q.gte("created_at", from);
  const { data: leads } = await q.limit(50000);
  const arr = (leads ?? []) as any[];
  counts.scraped = arr.length;
  counts.valid_mobile = arr.filter(l => l.phone).length;
  const passSent = new Set(["MESSAGED","DELIVERED","REPLIED","CHECKOUT_SENT","PAID","ACTIVATED"]);
  const passDelivered = new Set(["DELIVERED","REPLIED","CHECKOUT_SENT","PAID","ACTIVATED"]);
  const passCheckout = new Set(["CHECKOUT_SENT","PAID","ACTIVATED"]);
  const passPaid = new Set(["PAID","ACTIVATED"]);
  counts.sms_sent = arr.filter(l => passSent.has(l.lead_status)).length;
  counts.sms_delivered = arr.filter(l => passDelivered.has(l.lead_status)).length;
  counts.checkout_started = arr.filter(l => passCheckout.has(l.lead_status)).length;
  counts.payment_success = arr.filter(l => passPaid.has(l.lead_status)).length;
  counts.activated = arr.filter(l => l.lead_status === "ACTIVATED").length;

  // contractor_funnel_events
  let ev = supabase.from("contractor_funnel_events" as any).select("event_type");
  if (from) ev = ev.gte("created_at", from);
  const { data: events } = await ev.limit(100000);
  const evArr = (events ?? []) as any[];
  const cnt = (t: string) => evArr.filter(e => e.event_type === t).length;
  counts.clicked = cnt("sms_clicked");
  counts.landing_viewed = cnt("landing_view") + cnt("landing_viewed") + cnt("landing_viewed_first_dollar");
  counts.alex_started = cnt("alex_started");
  counts.profile_started = cnt("registration_started") + cnt("signup_started");

  return counts;
}

export function useFirstDollarFunnel(period: FunnelPeriod) {
  return useQuery({
    queryKey: ["first-dollar-funnel", period],
    queryFn: () => fetchCounts(period),
    refetchInterval: 15_000,
  });
}
