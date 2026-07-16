/**
 * UNPRO — Auto Repair Tick
 * Pings critical dependencies and logs to auto_repair_attempts.
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function timedFetch(url: string, opts: RequestInit = {}, timeoutMs = 6000) {
  const start = performance.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    return { ok: res.ok, status: res.status, latency: Math.round(performance.now() - start) };
  } catch (e) {
    return { ok: false, status: 0, latency: Math.round(performance.now() - start), error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const attempts: Array<Record<string, unknown>> = [];

  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (twilioSid && twilioToken) {
    const auth = btoa(`${twilioSid}:${twilioToken}`);
    const r = await timedFetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}.json`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    attempts.push({
      target: "twilio", check_type: "http_ping",
      status: r.ok ? "healthy" : "failed",
      latency_ms: r.latency, error_message: r.ok ? null : `HTTP ${r.status}`,
      metadata: { status_code: r.status },
    });
  } else {
    attempts.push({ target: "twilio", check_type: "http_ping", status: "unrepairable", error_message: "Missing secrets", metadata: {} });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey) {
    const r = await timedFetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${resendKey}` },
    });
    attempts.push({
      target: "resend", check_type: "http_ping",
      status: r.ok ? "healthy" : "failed",
      latency_ms: r.latency, error_message: r.ok ? null : `HTTP ${r.status}`,
      metadata: { status_code: r.status },
    });
  } else {
    attempts.push({ target: "resend", check_type: "http_ping", status: "unrepairable", error_message: "Missing secret", metadata: {} });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (stripeKey) {
    const r = await timedFetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    attempts.push({
      target: "stripe", check_type: "http_ping",
      status: r.ok ? "healthy" : "failed",
      latency_ms: r.latency, error_message: r.ok ? null : `HTTP ${r.status}`,
      metadata: { status_code: r.status },
    });
  } else {
    attempts.push({ target: "stripe", check_type: "http_ping", status: "unrepairable", error_message: "Missing secret", metadata: {} });
  }

  // Supabase itself
  const dbStart = performance.now();
  const { error: dbErr } = await supabase.from("system_integrity_thresholds").select("pipeline_key").limit(1);
  attempts.push({
    target: "supabase_db", check_type: "select_ping",
    status: dbErr ? "failed" : "healthy",
    latency_ms: Math.round(performance.now() - dbStart),
    error_message: dbErr?.message ?? null,
    metadata: {},
  });

  if (attempts.length > 0) {
    await supabase.from("auto_repair_attempts").insert(attempts);
  }

  return new Response(JSON.stringify({ ok: true, attempts }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
