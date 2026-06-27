// UNPRO — Daily email health selftest.
// Sends "[UNPRO Email Health Check]" through the production pipeline (outreach-resend-send)
// and records the outcome in email_send_log + raises a system_event on failure.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SELFTEST_TO = Deno.env.get("EMAIL_SELFTEST_TO") ?? "yturcotte@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(SUPABASE_URL, SRK, { auth: { persistSession: false } });

  const now = new Date().toISOString();
  const subject = "[UNPRO Email Health Check]";
  const ctaUrl = "https://unpro.ca/admin/email-sender-health";
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;padding:24px;background:#fff;color:#111">
      <h2 style="margin:0 0 12px">UNPRO — Email Health Check</h2>
      <p>Daily production-pipeline verification.</p>
      <p>Timestamp: <code>${now}</code></p>
      <p><a href="${ctaUrl}" style="display:inline-block;padding:12px 18px;background:#0F62FE;color:#fff;text-decoration:none;border-radius:8px">Open Email Health</a></p>
      <p style="color:#666;font-size:12px">Sent from Alex d'UNPRO &lt;alex@mail.unpro.ca&gt;</p>
    </div>`;

  try {
    const { data, error } = await sb.functions.invoke("outreach-resend-send", {
      body: {
        to: SELFTEST_TO,
        subject,
        html,
        cta_url: ctaUrl,
        template_name: "email-health-selftest",
        tags: { campaign: "email_health_selftest", run: now },
      },
    });

    const ok = !error && (data as any)?.ok !== false;
    const messageId = (data as any)?.id ?? (data as any)?.message_id ?? null;

    await sb.from("email_health_selftest_runs").insert({
      run_type: "daily_selftest",
      recipient: SELFTEST_TO,
      subject,
      passed: ok,
      provider_message_id: messageId,
      provider_response: data ?? error ?? null,
      error_message: ok ? null : (error?.message ?? JSON.stringify(data).slice(0, 500)),
      ran_at: now,
    });

    if (!ok) {
      await sb.from("system_events").insert({
        event_type: "EMAIL_HEALTH_SELFTEST_FAILED",
        severity: "critical",
        payload: { error: error?.message ?? data, recipient: SELFTEST_TO, when: now },
        created_at: now,
      });
    }

    return new Response(JSON.stringify({ ok, message_id: messageId, recipient: SELFTEST_TO, when: now }), {
      status: ok ? 200 : 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message;
    await sb.from("system_events").insert({
      event_type: "EMAIL_HEALTH_SELFTEST_FAILED",
      severity: "critical",
      payload: { error: msg, recipient: SELFTEST_TO, when: now },
      created_at: now,
    });
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
