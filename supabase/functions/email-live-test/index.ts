// Live Resend send + logs to email_health_checks + email_delivery_events.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SENDER_EMAIL = "alex@mail.unpro.ca";
const SENDER_NAME = "Alex d'UNPRO";

function classify(status: number, body: any): string {
  if (status === 401 || status === 403) return "INVALID_API_KEY";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "RESEND_OUTAGE";
  const name = (body?.name || body?.message || "").toString().toLowerCase();
  if (name.includes("domain")) return "DOMAIN_NOT_VERIFIED";
  if (name.includes("from") || name.includes("sender")) return "INVALID_SENDER";
  if (name.includes("validation") || name.includes("template")) return "TEMPLATE_ERROR";
  return "UNKNOWN";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let recipient = "admin@unpro.ca";
  let triggeredBy = "manual";
  try {
    const body = await req.json();
    if (body?.recipient) recipient = String(body.recipient).trim();
    if (body?.triggered_by) triggeredBy = String(body.triggered_by);
  } catch { /* body optional */ }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_recipient" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const started = Date.now();
  const timestamp = new Date().toISOString();
  const deployId = Deno.env.get("SUPABASE_ENV") ?? "production";

  const payload = {
    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    to: [recipient],
    subject: "UNPRO Live Email Health Check",
    html: `<div style="font-family:Inter,Arial,sans-serif;padding:24px;color:#111"><h1 style="margin:0 0 12px">UNPRO — Live Email Health Check</h1><p>Timestamp: <b>${timestamp}</b></p><p>Environnement: <b>${deployId}</b></p><p>Sender: <b>${SENDER_EMAIL}</b></p><p style="color:#666;font-size:12px">Si vous recevez ce message, la chaîne d'envoi UNPRO fonctionne.</p></div>`,
    text: `UNPRO Live Email Health Check\nTimestamp: ${timestamp}\nEnv: ${deployId}`,
  };

  let status = 0;
  let body: any = null;
  let ok = false;
  let messageId: string | null = null;
  let errorCategory = "NONE";
  let errorMessage: string | null = null;

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    status = r.status;
    body = await r.json().catch(() => ({}));
    ok = r.ok;
    if (ok) {
      messageId = body?.id ?? null;
    } else {
      errorCategory = classify(status, body);
      errorMessage = body?.message ?? body?.name ?? `HTTP ${status}`;
    }
  } catch (e) {
    errorCategory = "EDGE_FUNCTION_ERROR";
    errorMessage = (e as Error).message;
  }

  const latency = Date.now() - started;

  // Log to email_delivery_events
  await admin.from("email_delivery_events").insert({
    message_id: messageId,
    recipient_email: recipient,
    event_type: ok ? "sent" : "failed",
    provider_name: "resend",
    metadata_json: {
      test: true,
      subject: payload.subject,
      status_code: status,
      error_category: errorCategory,
      error_message: errorMessage,
      raw_body: body,
      latency_ms: latency,
    },
  });

  // Log to email_health_checks
  await admin.from("email_health_checks").insert({
    overall_status: ok ? "healthy" : "failed",
    resend_auth_ok: status !== 401 && status !== 403 && !!RESEND_API_KEY,
    domain_ok: ok,
    sender_ok: ok,
    live_send_ok: ok,
    latency_ms: latency,
    error_category: errorCategory,
    reason: ok ? "Envoi live réussi" : (errorMessage ?? "Envoi live échoué"),
    impact: ok ? "HEALTHY" : "FAILED — voir catégorie d'erreur",
    triggered_by: triggeredBy,
    details_json: { recipient, message_id: messageId, status, body },
  });

  return new Response(
    JSON.stringify({
      ok,
      message_id: messageId,
      provider_status: status,
      provider_response: body,
      latency_ms: latency,
      error_category: errorCategory,
      error_message: errorMessage,
    }),
    { status: ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
