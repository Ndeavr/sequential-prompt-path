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

async function checkTwilioAuth(): Promise<CheckOutcome> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  const conn = Deno.env.get("TWILIO_API_KEY");
  if (!key || !conn)
    return {
      provider: "twilio", check_name: "auth", status: "fail", latency_ms: 0,
      error_body: { missing: { LOVABLE_API_KEY: !key, TWILIO_API_KEY: !conn } },
    };
  const { ms, value: r } = await timed(() =>
    fetch(`${GATEWAY}/twilio/Accounts.json`, {
      headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": conn },
    }),
  );
  const body = await r.text().catch(() => "");
  let parsed: unknown = body; try { parsed = JSON.parse(body); } catch { /* ignore */ }
  return {
    provider: "twilio",
    check_name: "auth",
    status: r.ok ? "pass" : "fail",
    http_status: r.status,
    latency_ms: ms,
    error_body: r.ok ? undefined : parsed,
  };
}

async function checkTwilioFromNumber(): Promise<CheckOutcome> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  const conn = Deno.env.get("TWILIO_API_KEY");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!key || !conn) return { provider: "twilio", check_name: "from_number", status: "skipped", latency_ms: 0, error_body: { reason: "twilio auth secrets missing" } };
  if (!from) return { provider: "twilio", check_name: "from_number", status: "fail", latency_ms: 0, error_body: { missing: "TWILIO_FROM_NUMBER" } };
  const { ms, value: r } = await timed(() =>
    fetch(`${GATEWAY}/twilio/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(from)}`, {
      headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": conn },
    }),
  );
  const body = await r.text().catch(() => "");
  let parsed: any = body; try { parsed = JSON.parse(body); } catch { /* ignore */ }
  const count = Array.isArray(parsed?.incoming_phone_numbers) ? parsed.incoming_phone_numbers.length : 0;
  return {
    provider: "twilio",
    check_name: "from_number",
    status: r.ok && count > 0 ? "pass" : "fail",
    http_status: r.status,
    latency_ms: ms,
    error_body: r.ok && count > 0 ? undefined : parsed,
    metadata: { configured_from: from, matched_count: count },
  };
}

async function checkResend(): Promise<CheckOutcome> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { provider: "resend", check_name: "auth", status: "fail", latency_ms: 0, error_body: { missing: "RESEND_API_KEY" } };
  const { ms, value: r } = await timed(() =>
    fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } }),
  );
  const body = await r.text().catch(() => "");
  let parsed: unknown = body; try { parsed = JSON.parse(body); } catch { /* ignore */ }
  return {
    provider: "resend",
    check_name: "auth",
    status: r.ok ? "pass" : "fail",
    http_status: r.status,
    latency_ms: ms,
    error_body: r.ok ? undefined : parsed,
  };
}

async function checkStripe(): Promise<CheckOutcome> {
  const sk = Deno.env.get("STRIPE_SECRET_KEY");
  const wh = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!sk) return { provider: "stripe", check_name: "auth", status: "fail", latency_ms: 0, error_body: { missing: "STRIPE_SECRET_KEY" } };
  const { ms, value: r } = await timed(() =>
    fetch("https://api.stripe.com/v1/account", { headers: { Authorization: `Bearer ${sk}` } }),
  );
  const body = await r.text().catch(() => "");
  let parsed: unknown = body; try { parsed = JSON.parse(body); } catch { /* ignore */ }
  return {
    provider: "stripe",
    check_name: "auth",
    status: r.ok ? "pass" : "fail",
    http_status: r.status,
    latency_ms: ms,
    error_body: r.ok ? undefined : parsed,
    metadata: { webhook_secret_present: !!wh },
  };
}

async function checkLovableAI(): Promise<CheckOutcome> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { provider: "lovable_ai", check_name: "auth", status: "fail", latency_ms: 0, error_body: { missing: "LOVABLE_API_KEY" } };
  const { ms, value: r } = await timed(() =>
    fetch(`${GATEWAY}/api/v1/verify_credentials`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
    }),
  );
  const body = await r.text().catch(() => "");
  let parsed: unknown = body; try { parsed = JSON.parse(body); } catch { /* ignore */ }
  return {
    provider: "lovable_ai",
    check_name: "auth",
    status: r.ok ? "pass" : "fail",
    http_status: r.status,
    latency_ms: ms,
    error_body: r.ok ? undefined : parsed,
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
