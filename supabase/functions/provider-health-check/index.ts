// provider-health-check — read-only auth probes for Twilio, Resend, Stripe,
// Lovable AI. Records PASS/FAIL rows in provider_health_checks and returns
// the latest per (provider, check_name).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const GATEWAY = "https://connector-gateway.lovable.dev";

type CheckOutcome = {
  provider: string;
  check_name: string;
  status: "pass" | "fail" | "skipped";
  http_status?: number;
  latency_ms: number;
  error_body?: unknown;
  metadata?: Record<string, unknown>;
};

async function timed<T>(fn: () => Promise<T>): Promise<{ ms: number; value: T }> {
  const t0 = Date.now();
  const value = await fn();
  return { ms: Date.now() - t0, value };
}

function secretShape(name: string, expectedPrefix?: string) {
  const v = Deno.env.get(name);
  if (!v) return { present: false };
  const trimmed = v.trim();
  return {
    present: true,
    length: trimmed.length,
    prefix_ok: expectedPrefix ? trimmed.startsWith(expectedPrefix) : null,
    first4: trimmed.slice(0, 4),
    last4: trimmed.slice(-4),
  };
}

function bodyPreview(s: string) {
  return s.length > 800 ? s.slice(0, 800) + "…" : s;
}

async function probeFetch(url: string, init: RequestInit, headerNames: string[]) {
  const { ms, value: r } = await timed(() => fetch(url, init));
  const raw = await r.text().catch(() => "");
  let parsed: unknown = raw;
  try { parsed = JSON.parse(raw); } catch { /* keep raw */ }
  return {
    ms,
    http_status: r.status,
    ok: r.ok,
    parsed,
    debug: {
      request_url: url,
      http_status: r.status,
      response_body_preview: bodyPreview(raw),
      headers_used: headerNames,
    },
  };
}

async function checkTwilioAuth(): Promise<CheckOutcome> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  const conn = Deno.env.get("TWILIO_API_KEY");
  if (!key || !conn)
    return {
      provider: "twilio", check_name: "auth", status: "fail", latency_ms: 0,
      error_body: { missing: { LOVABLE_API_KEY: !key, TWILIO_API_KEY: !conn } },
      metadata: { note: "Gateway mode. TWILIO_ACCOUNT_SID/AUTH_TOKEN are NOT required." },
    };
  // Gateway auto-prepends /2010-04-01/Accounts/{AccountSid}. Use a real Twilio
  // sub-resource path (Messages) — /Accounts.json returns 404 through the gateway.
  const url = `${GATEWAY}/twilio/Messages.json?PageSize=1`;
  const p = await probeFetch(url, {
    headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": conn },
  }, ["Authorization", "X-Connection-Api-Key"]);
  return {
    provider: "twilio",
    check_name: "auth",
    status: p.ok ? "pass" : "fail",
    http_status: p.http_status,
    latency_ms: p.ms,
    error_body: p.ok ? undefined : p.parsed,
    metadata: { debug: p.debug, mode: "gateway", secrets_used: ["LOVABLE_API_KEY", "TWILIO_API_KEY"] },
  };
}

async function checkTwilioFromNumber(): Promise<CheckOutcome> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  const conn = Deno.env.get("TWILIO_API_KEY");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!key || !conn) return { provider: "twilio", check_name: "from_number", status: "skipped", latency_ms: 0, error_body: { reason: "twilio auth secrets missing" } };
  if (!from) return { provider: "twilio", check_name: "from_number", status: "fail", latency_ms: 0, error_body: { missing: "TWILIO_FROM_NUMBER" } };
  const url = `${GATEWAY}/twilio/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(from)}`;
  const p = await probeFetch(url, {
    headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": conn },
  }, ["Authorization", "X-Connection-Api-Key"]);
  const parsed: any = p.parsed;
  const count = Array.isArray(parsed?.incoming_phone_numbers) ? parsed.incoming_phone_numbers.length : 0;
  return {
    provider: "twilio",
    check_name: "from_number",
    status: p.ok && count > 0 ? "pass" : "fail",
    http_status: p.http_status,
    latency_ms: p.ms,
    error_body: p.ok && count > 0 ? undefined : parsed,
    metadata: { configured_from: from, matched_count: count, debug: p.debug },
  };
}

async function checkResend(): Promise<CheckOutcome> {
  const key = Deno.env.get("RESEND_API_KEY");
  const lov = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { provider: "resend", check_name: "auth", status: "fail", latency_ms: 0, error_body: { missing: "RESEND_API_KEY" } };
  const isDirect = key.startsWith("re_");
  let url: string;
  let headers: Record<string, string>;
  let headerNames: string[];
  if (isDirect) {
    url = "https://api.resend.com/domains";
    headers = { Authorization: `Bearer ${key}` };
    headerNames = ["Authorization"];
  } else {
    // Connector gateway key (e.g. lovc_...) — must route through the gateway.
    if (!lov) return { provider: "resend", check_name: "auth", status: "fail", latency_ms: 0, error_body: { missing: "LOVABLE_API_KEY (required for gateway-mode Resend)" } };
    url = `${GATEWAY}/resend/domains`;
    headers = { Authorization: `Bearer ${lov}`, "X-Connection-Api-Key": key };
    headerNames = ["Authorization", "X-Connection-Api-Key"];
  }
  const p = await probeFetch(url, { headers }, headerNames);
  return {
    provider: "resend",
    check_name: "auth",
    status: p.ok ? "pass" : "fail",
    http_status: p.http_status,
    latency_ms: p.ms,
    error_body: p.ok ? undefined : p.parsed,
    metadata: { mode: isDirect ? "direct" : "gateway", key_prefix: key.slice(0, 4), debug: p.debug },
  };
}

async function checkStripe(): Promise<CheckOutcome> {
  const sk = Deno.env.get("STRIPE_SECRET_KEY");
  const wh = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!sk) return { provider: "stripe", check_name: "auth", status: "fail", latency_ms: 0, error_body: { missing: "STRIPE_SECRET_KEY" } };
  const p = await probeFetch("https://api.stripe.com/v1/account", {
    headers: { Authorization: `Bearer ${sk}` },
  }, ["Authorization"]);
  return {
    provider: "stripe",
    check_name: "auth",
    status: p.ok ? "pass" : "fail",
    http_status: p.http_status,
    latency_ms: p.ms,
    error_body: p.ok ? undefined : p.parsed,
    metadata: { webhook_secret_present: !!wh, debug: p.debug },
  };
}

async function checkLovableAI(): Promise<CheckOutcome> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { provider: "lovable_ai", check_name: "auth", status: "fail", latency_ms: 0, error_body: { missing: "LOVABLE_API_KEY" } };
  // Real 1-token chat probe against the AI Gateway used in production.
  const url = "https://ai.gateway.lovable.dev/v1/chat/completions";
  const p = await probeFetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    }),
  }, ["Authorization", "Content-Type"]);
  return {
    provider: "lovable_ai",
    check_name: "auth",
    status: p.ok ? "pass" : "fail",
    http_status: p.http_status,
    latency_ms: p.ms,
    error_body: p.ok ? undefined : p.parsed,
    metadata: { debug: p.debug, probe: "chat.completions max_tokens=1" },
  };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const results = await Promise.all([
      checkTwilioAuth(),
      checkTwilioFromNumber(),
      checkResend(),
      checkStripe(),
      checkLovableAI(),
    ]);

    await sb.from("provider_health_checks").insert(
      results.map((r) => ({
        provider: r.provider,
        check_name: r.check_name,
        status: r.status,
        http_status: r.http_status ?? null,
        latency_ms: r.latency_ms,
        error_body: r.error_body ?? null,
        metadata: r.metadata ?? null,
      })),
    );

    const secrets = {
      TWILIO_API_KEY: secretShape("TWILIO_API_KEY"),
      TWILIO_FROM_NUMBER: secretShape("TWILIO_FROM_NUMBER", "+"),
      LOVABLE_API_KEY: secretShape("LOVABLE_API_KEY"),
      RESEND_API_KEY: secretShape("RESEND_API_KEY", "re_"),
      STRIPE_SECRET_KEY: secretShape("STRIPE_SECRET_KEY", "sk_"),
      STRIPE_WEBHOOK_SECRET: secretShape("STRIPE_WEBHOOK_SECRET", "whsec_"),
    };

    const twilioPass = results.find((r) => r.provider === "twilio" && r.check_name === "auth")?.status === "pass";
    const outreachSafeToEnable = twilioPass;

    return json({ results, secrets, outreach_safe_to_enable: outreachSafeToEnable });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
