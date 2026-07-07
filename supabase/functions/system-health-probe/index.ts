// system-health-probe — reads live status for Google Places, Twilio, Stripe, Resend,
// and the top edge functions. Returns real numbers — never mocked.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function probeGooglePlaces() {
  const key =
    Deno.env.get("GOOGLE_PLACES_SERVER_KEY") ||
    Deno.env.get("GOOGLE_MAPS_API_KEY") ||
    Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!key) return { ok: false, code: "MISSING_KEY", message: "GOOGLE_PLACES_API_KEY not set", detail: null };
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=plombier+montreal&key=${key}`;
    const r = await fetch(url);
    const j = await r.json();
    return {
      ok: j.status === "OK" || j.status === "ZERO_RESULTS",
      code: j.status,
      message: j.error_message ?? "",
      detail: { results: (j.results ?? []).length },
    };
  } catch (e) {
    return { ok: false, code: "FETCH_ERROR", message: String((e as Error).message), detail: null };
  }
}

async function probeTwilio() {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!sid || !token) return { ok: false, code: "MISSING_KEY", message: "TWILIO credentials not set", detail: {} };
  try {
    const auth = "Basic " + btoa(`${sid}:${token}`);
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, { headers: { Authorization: auth } });
    const j = await r.json();
    return {
      ok: r.ok,
      code: r.ok ? "OK" : String(j.code ?? r.status),
      message: j.message ?? j.status ?? "",
      detail: {
        account_sid: sid,
        friendly_name: j.friendly_name,
        status: j.status,
        type: j.type,
        messaging_service_sid: Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") ?? null,
        from_number: Deno.env.get("TWILIO_FROM_NUMBER") ?? null,
      },
    };
  } catch (e) {
    return { ok: false, code: "FETCH_ERROR", message: String((e as Error).message), detail: {} };
  }
}

async function probeStripe() {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return { ok: false, code: "MISSING_KEY", message: "STRIPE_SECRET_KEY not set", detail: {} };
  try {
    const r = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const j = await r.json();
    return {
      ok: r.ok,
      code: r.ok ? "OK" : String(j.error?.code ?? r.status),
      message: j.error?.message ?? "",
      detail: {
        livemode: j.livemode,
        available: (j.available ?? []).map((a: any) => ({ amount: a.amount, currency: a.currency })),
      },
    };
  } catch (e) {
    return { ok: false, code: "FETCH_ERROR", message: String((e as Error).message), detail: {} };
  }
}

async function probeResend() {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { ok: false, code: "MISSING_KEY", message: "RESEND_API_KEY not set", detail: {} };
  try {
    const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } });
    const j = await r.json();
    return {
      ok: r.ok,
      code: r.ok ? "OK" : String(j.name ?? r.status),
      message: j.message ?? "",
      detail: { domains: (j.data ?? []).map((d: any) => ({ name: d.name, status: d.status })) },
    };
  } catch (e) {
    return { ok: false, code: "FETCH_ERROR", message: String((e as Error).message), detail: {} };
  }
}

async function edgeFunctionSummary(sb: any) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data, error } = await sb
    .from("platform_operation_outcomes")
    .select("operation, success, failure_code, created_at")
    .gte("created_at", since)
    .limit(5000);
  if (error) return { rows: [] as any[], error: error.message };
  const map = new Map<string, { total: number; ok: number; last_error: string | null; last_at: string | null }>();
  for (const r of (data ?? []) as any[]) {
    const cur = map.get(r.operation) ?? { total: 0, ok: 0, last_error: null, last_at: null };
    cur.total++;
    if (r.success) cur.ok++;
    if (!r.success && !cur.last_error) cur.last_error = r.failure_code ?? "unknown";
    if (!cur.last_at || r.created_at > cur.last_at) cur.last_at = r.created_at;
    map.set(r.operation, cur);
  }
  return {
    rows: [...map.entries()]
      .map(([op, v]) => ({ operation: op, total: v.total, success_rate: v.total ? v.ok / v.total : 0, last_error: v.last_error, last_at: v.last_at }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 25),
  };
}

async function lastSmsMetrics(sb: any) {
  const { data: last } = await sb.from("acq_sms_logs").select("created_at, status").order("created_at", { ascending: false }).limit(1);
  const { data: delivered } = await sb.from("acq_sms_logs").select("created_at").eq("status", "delivered").order("created_at", { ascending: false }).limit(1);
  return { last_sent_at: last?.[0]?.created_at ?? null, last_delivered_at: delivered?.[0]?.created_at ?? null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const [google, twilio, stripe, resend, edge, smsMetrics] = await Promise.all([
    probeGooglePlaces(),
    probeTwilio(),
    probeStripe(),
    probeResend(),
    edgeFunctionSummary(sb),
    lastSmsMetrics(sb),
  ]);

  // Auto-file critical alerts on failures so watchdog + admin dashboards see them.
  const alerts: any[] = [];
  if (!google.ok) alerts.push({ source: "google_places", severity: "critical", code: google.code, message: google.message || "Google Places invalid", details: google.detail ?? {} });
  if (!twilio.ok) alerts.push({ source: "twilio", severity: "critical", code: twilio.code, message: twilio.message || "Twilio invalid", details: twilio.detail ?? {} });
  if (!stripe.ok) alerts.push({ source: "stripe", severity: "critical", code: stripe.code, message: stripe.message || "Stripe invalid", details: stripe.detail ?? {} });
  if (!resend.ok) alerts.push({ source: "resend", severity: "warning", code: resend.code, message: resend.message || "Resend invalid", details: resend.detail ?? {} });
  if (alerts.length) {
    await sb.from("system_alerts").insert(alerts);
  }

  return new Response(
    JSON.stringify({ probed_at: new Date().toISOString(), google, twilio, stripe, resend, edge_functions: edge, sms_metrics: smsMetrics }, null, 2),
    { headers: { ...cors, "content-type": "application/json" } },
  );
});
