// system-watchdog — hourly cron. Calls system-health-probe, writes system_alerts
// rows for any critical failure. Also flags stale cron jobs (no SMS in 6h,
// no edge outcome in 1h) so revenue-idle is loud, not silent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(SB_URL, SB_KEY);
  const alerts: any[] = [];

  // 1. Live probe (auto-inserts its own alerts, so just record the probe event).
  let probe: any = null;
  try {
    const r = await fetch(`${SB_URL}/functions/v1/system-health-probe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SB_KEY}`, "content-type": "application/json" },
      body: "{}",
    });
    probe = await r.json();
  } catch (e) {
    alerts.push({ source: "watchdog", severity: "critical", code: "PROBE_FAILED", message: String((e as Error).message), details: {} });
  }

  // 2. SMS idle detector (no successful SMS in 6h despite prospects available).
  const sixHrs = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const { count: recentSms } = await sb
    .from("acq_sms_logs")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sixHrs);
  const { count: eligible } = await sb
    .from("contractor_prospects")
    .select("*", { count: "exact", head: true })
    .not("phone", "is", null)
    .neq("phone", "")
    .neq("do_not_contact", true);
  if ((recentSms ?? 0) === 0 && (eligible ?? 0) > 0) {
    alerts.push({
      source: "sms_engine",
      severity: "critical",
      code: "SMS_ENGINE_IDLE",
      message: `Aucun SMS envoyé depuis 6h alors que ${eligible} prospects avec téléphone attendent.`,
      details: { eligible, recent_sms: recentSms ?? 0 },
    });
  }

  // 3. Edge functions idle (no platform_operation_outcomes in the last hour).
  const oneHr = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count: recentOps } = await sb
    .from("platform_operation_outcomes")
    .select("*", { count: "exact", head: true })
    .gte("created_at", oneHr);
  if ((recentOps ?? 0) === 0) {
    alerts.push({
      source: "edge_functions",
      severity: "warning",
      code: "NO_EDGE_ACTIVITY",
      message: "Aucun événement platform_operation_outcomes depuis 1h.",
      details: {},
    });
  }

  if (alerts.length) await sb.from("system_alerts").insert(alerts);

  return new Response(
    JSON.stringify({ probed: !!probe, new_alerts: alerts.length, ran_at: new Date().toISOString() }, null, 2),
    { headers: { ...cors, "content-type": "application/json" } },
  );
});
