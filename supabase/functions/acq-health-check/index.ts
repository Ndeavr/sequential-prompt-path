// Health check for acquisition pipeline services
// Writes results to public.system_config_health
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type HealthStatus = "connected" | "missing" | "invalid" | "limited" | "unknown";

interface Result {
  service_name: string;
  status: HealthStatus;
  required_for: string[];
  error_message?: string | null;
  metadata?: Record<string, unknown>;
}

async function checkSecret(name: string): Promise<boolean> {
  return !!Deno.env.get(name);
}

async function pingGooglePlaces(): Promise<Result> {
  // COST INVARIANT (incident 2026-08): health checks must NEVER emit a billable
  // Places call. We report credential presence only; real availability is
  // tracked by the discovery gateway (provider_circuit_state / places_api_calls).
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  const legacyKey = Deno.env.get("GOOGLE_PLACES_SERVER_KEY") || Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (lovableKey && mapsKey) {
    return { service_name: "google_places", status: "connected", required_for: ["scrape"], metadata: { source: "lovable_connector", probe: "credentials_only" } };
  }
  if (legacyKey) {
    return { service_name: "google_places", status: "connected", required_for: ["scrape"], metadata: { source: "legacy_key", probe: "credentials_only" } };
  }
  return { service_name: "google_places", status: "missing", required_for: ["scrape"], error_message: "Connecteur Google Maps Platform non lié (LOVABLE_API_KEY + GOOGLE_MAPS_API_KEY)" };
}

async function pingResend(): Promise<Result> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { service_name: "resend", status: "missing", required_for: ["outreach_email"], error_message: "RESEND_API_KEY absent" };
  try {
    const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } });
    if (r.status === 401) return { service_name: "resend", status: "invalid", required_for: ["outreach_email"], error_message: "Clé Resend invalide" };
    return { service_name: "resend", status: r.ok ? "connected" : "limited", required_for: ["outreach_email"] };
  } catch (e) {
    return { service_name: "resend", status: "invalid", required_for: ["outreach_email"], error_message: String(e) };
  }
}

async function pingTwilio(): Promise<Result> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const tok = Deno.env.get("TWILIO_AUTH_TOKEN");
  const msvc = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  if (!sid || !tok) return { service_name: "twilio", status: "missing", required_for: ["outreach_sms"], error_message: "TWILIO_ACCOUNT_SID/AUTH_TOKEN absent" };
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: "Basic " + btoa(`${sid}:${tok}`) },
    });
    if (r.status === 401) return { service_name: "twilio", status: "invalid", required_for: ["outreach_sms"], error_message: "Identifiants Twilio invalides" };
    return {
      service_name: "twilio",
      status: r.ok ? (msvc ? "connected" : "limited") : "limited",
      required_for: ["outreach_sms"],
      error_message: msvc ? null : "TWILIO_MESSAGING_SERVICE_SID manquant",
    };
  } catch (e) {
    return { service_name: "twilio", status: "invalid", required_for: ["outreach_sms"], error_message: String(e) };
  }
}

async function pingStripe(): Promise<Result> {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return { service_name: "stripe", status: "missing", required_for: ["checkout", "activation"], error_message: "STRIPE_SECRET_KEY absent" };
  try {
    const r = await fetch("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${key}` } });
    if (r.status === 401) return { service_name: "stripe", status: "invalid", required_for: ["checkout"], error_message: "Clé Stripe invalide" };
    const j = await r.json();
    return { service_name: "stripe", status: "connected", required_for: ["checkout", "activation"], metadata: { livemode: j.livemode } };
  } catch (e) {
    return { service_name: "stripe", status: "invalid", required_for: ["checkout"], error_message: String(e) };
  }
}

async function pingStripeWebhook(): Promise<Result> {
  const ws = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  return {
    service_name: "stripe_webhook",
    status: ws ? "connected" : "missing",
    required_for: ["activation"],
    error_message: ws ? null : "STRIPE_WEBHOOK_SECRET non configuré — l'activation auto est désactivée",
  };
}

async function pingGemini(): Promise<Result> {
  const key = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { service_name: "gemini", status: "missing", required_for: ["aipp", "outreach"], error_message: "GEMINI_API_KEY/LOVABLE_API_KEY absent" };
  return { service_name: "gemini", status: "connected", required_for: ["aipp", "outreach"] };
}

async function pingFirecrawl(): Promise<Result> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) return { service_name: "firecrawl", status: "missing", required_for: ["enrich", "aipp"], error_message: "FIRECRAWL_API_KEY absent" };
  return { service_name: "firecrawl", status: "connected", required_for: ["enrich", "aipp"] };
}

async function pingSupabase(): Promise<Result> {
  const url = Deno.env.get("SUPABASE_URL");
  const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !srv) return { service_name: "supabase_edge", status: "missing", required_for: ["all"], error_message: "SUPABASE_URL/SERVICE_ROLE_KEY absent" };
  return { service_name: "supabase_edge", status: "connected", required_for: ["all"] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: runRow } = await supabase
    .from("acquisition_pipeline_runs")
    .insert({ run_type: "health_check", status: "running" })
    .select("id")
    .single();
  const runId = runRow?.id;

  try {
    const results = await Promise.all([
      pingGooglePlaces(),
      pingResend(),
      pingTwilio(),
      pingStripe(),
      pingStripeWebhook(),
      pingGemini(),
      pingFirecrawl(),
      pingSupabase(),
    ]);

    const now = new Date().toISOString();
    for (const r of results) {
      await supabase.from("system_config_health").upsert({
        service_name: r.service_name,
        status: r.status,
        required_for: r.required_for,
        last_checked_at: now,
        error_message: r.error_message ?? null,
        metadata: r.metadata ?? {},
        updated_at: now,
      }, { onConflict: "service_name" });
    }

    const failed = results.filter(r => r.status === "missing" || r.status === "invalid").length;
    const limited = results.filter(r => r.status === "limited").length;

    if (runId) {
      await supabase.from("acquisition_pipeline_runs").update({
        status: failed > 0 ? "partial" : "succeeded",
        completed_at: now,
        total_items: results.length,
        succeeded_count: results.length - failed - limited,
        failed_count: failed,
        blocked_count: limited,
      }).eq("id", runId);
    }

    return new Response(JSON.stringify({ ok: true, results, run_id: runId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (runId) {
      await supabase.from("acquisition_pipeline_runs").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_summary: String(e),
      }).eq("id", runId);
    }
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
