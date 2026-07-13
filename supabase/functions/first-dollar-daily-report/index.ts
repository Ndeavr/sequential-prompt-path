/**
 * first-dollar-daily-report — Snapshot yesterday's funnel metrics + top drop-off.
 * Cron this every morning at 08:00 America/Toronto.
 */
import { corsHeaders, adminClient } from "../_shared/launch.ts";

const STAGES = [
  "scraped",
  "valid_mobile",
  "sms_sent",
  "sms_delivered",
  "clicked",
  "landing_viewed",
  "alex_started",
  "profile_started",
  "checkout_started",
  "payment_success",
  "activated",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = adminClient();
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);
  const from = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
  const to = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  const metrics: Record<string, number> = {};
  for (const s of STAGES) metrics[s] = 0;

  // launch_leads snapshot
  const { data: leads } = await sb
    .from("launch_leads")
    .select("lead_status, phone, created_at")
    .gte("created_at", from)
    .lt("created_at", to);
  metrics.scraped = leads?.length ?? 0;
  metrics.valid_mobile = leads?.filter((l: any) => l.phone).length ?? 0;

  const passStates = new Set([
    "MESSAGED", "DELIVERED", "REPLIED", "CHECKOUT_SENT", "PAID", "ACTIVATED",
  ]);
  metrics.sms_sent = leads?.filter((l: any) => passStates.has(l.lead_status)).length ?? 0;
  metrics.sms_delivered = leads?.filter((l: any) =>
    ["DELIVERED", "REPLIED", "CHECKOUT_SENT", "PAID", "ACTIVATED"].includes(l.lead_status)
  ).length ?? 0;
  metrics.checkout_started = leads?.filter((l: any) =>
    ["CHECKOUT_SENT", "PAID", "ACTIVATED"].includes(l.lead_status)
  ).length ?? 0;
  metrics.payment_success = leads?.filter((l: any) =>
    ["PAID", "ACTIVATED"].includes(l.lead_status)
  ).length ?? 0;
  metrics.activated = leads?.filter((l: any) => l.lead_status === "ACTIVATED").length ?? 0;

  // Funnel events
  const { data: events } = await sb
    .from("contractor_funnel_events")
    .select("event_type, created_at")
    .gte("created_at", from)
    .lt("created_at", to);
  const countEvt = (e: string) => events?.filter((x: any) => x.event_type === e).length ?? 0;
  metrics.clicked = countEvt("sms_clicked");
  metrics.landing_viewed = countEvt("landing_view") + countEvt("landing_viewed");
  metrics.alex_started = countEvt("alex_started");
  metrics.profile_started = countEvt("registration_started") + countEvt("signup_started");

  // Detect top drop-off (largest % drop between adjacent stages)
  let topDropoff = "n/a";
  let worstPct = 0;
  for (let i = 1; i < STAGES.length; i++) {
    const prev = metrics[STAGES[i - 1]];
    const cur = metrics[STAGES[i]];
    if (prev === 0) continue;
    const drop = 1 - cur / prev;
    if (drop > worstPct) {
      worstPct = drop;
      topDropoff = `${STAGES[i - 1]} → ${STAGES[i]} (${Math.round(drop * 100)}%)`;
    }
  }

  const reportDate = new Date(from).toISOString().slice(0, 10);
  await sb.from("first_dollar_daily_reports").upsert(
    { report_date: reportDate, metrics, top_dropoff: topDropoff },
    { onConflict: "report_date" },
  );

  return new Response(
    JSON.stringify({ ok: true, report_date: reportDate, metrics, top_dropoff: topDropoff }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
