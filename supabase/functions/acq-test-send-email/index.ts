// UNPRO — Admin-only test email through Resend (via connector gateway).
// Strict admin override + allowlist + CTA enforcement + email_send_log persistence.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logAcquisitionEvent } from "../_shared/acquisitionEvents.ts";
import { createTrackedLink } from "../_shared/ctaTracker.ts";
import { EMAIL_FROM } from "../_shared/emailSender.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

function allowlist(): string[] {
  return (Deno.env.get("ADMIN_EMAIL_ALLOWLIST") ?? "")
    .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const body = await req.json().catch(() => ({} as any));
  const strict = body?.strict_admin_override === true;
  if (!strict) return json(403, { ok: false, error: "admin_override_required", hint: "pass { strict_admin_override: true }" });

  const to = String(body?.to || Deno.env.get("ADMIN_TEST_EMAIL") || "").trim().toLowerCase();
  if (!to) return json(400, { ok: false, error: "to email required" });

  const list = allowlist();
  if (list.length === 0) return json(500, { ok: false, error: "ADMIN_EMAIL_ALLOWLIST_not_set" });
  if (!list.includes(to)) return json(403, { ok: false, error: "not_in_admin_allowlist", to, allowlist_size: list.length });

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!lovableKey) return json(500, { ok: false, error: "LOVABLE_API_KEY missing" });
  if (!resendKey)  return json(500, { ok: false, error: "RESEND_API_KEY missing" });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // 1. Generate tracked CTA
  let ctaUrl: string;
  let trackingId: string;
  try {
    ctaUrl = await createTrackedLink("https://unpro.ca/entrepreneur", {
      channel: "email",
      campaign: "admin_test",
      metadata: { source: "acq-test-send-email", to },
    });
    trackingId = ctaUrl.split("/r/")[1];
  } catch (e) {
    return json(500, { ok: false, error: "tracking_link_failed", detail: String(e) });
  }

  const subject = body?.subject || `UNPRO test acquisition — ${new Date().toISOString()}`;
  const html = body?.html || `
    <div style="font-family:system-ui,sans-serif;line-height:1.5">
      <p>Bonjour,</p>
      <p>Ceci est un test administratif du pipeline d'envoi UNPRO. Un CTA suivi est inclus ci-dessous.</p>
      <p><a href="${ctaUrl}" style="display:inline-block;padding:12px 20px;background:#0f172a;color:#fff;border-radius:8px;text-decoration:none">Activer mon profil UNPRO</a></p>
      <p>OU répondez simplement <b>OUI</b> à ce message.</p>
      <p>— Alex d'UNPRO</p>
    </div>`;
  const text = body?.text || `Test UNPRO acquisition.\n\nActivez: ${ctaUrl}\nOU répondez OUI.\n\n— Alex`;

  // Enforce CTA presence
  if (!html.includes(ctaUrl) && !text.includes(ctaUrl)) {
    return json(400, { ok: false, error: "cta_missing_in_body" });
  }

  // Insert pending row in email_send_log
  const messageIdKey = `admin-test-${trackingId}`;
  await sb.from("email_send_log").insert({
    message_id: messageIdKey,
    template_name: "admin_test",
    recipient_email: to,
    status: "pending",
    metadata: { tracking_id: trackingId, cta_url: ctaUrl, strict_admin_override: true },
  });

  // 2. Send via Resend gateway
  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html,
      text,
      tags: [
        { name: "tracking_id", value: trackingId },
        { name: "campaign", value: "admin_test" },
      ],
    }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    await sb.from("email_send_log").insert({
      message_id: messageIdKey,
      template_name: "admin_test",
      recipient_email: to,
      status: "failed",
      error_message: JSON.stringify(data).slice(0, 2000),
      metadata: { tracking_id: trackingId, cta_url: ctaUrl, http_status: res.status },
    });
    await logAcquisitionEvent({
      channel: "email", event_type: "failed", provider: "resend",
      tracking_id: trackingId,
      metadata: { test: true, to, http_status: res.status, body: data },
    });
    return json(200, {
      ok: false,
      error: "RESEND_HTTP_ERROR",
      http_status: res.status,
      resend_body: data,
      to, subject, cta_url: ctaUrl, tracking_id: trackingId,
    });
  }

  const resendId = data?.id ?? null;
  await sb.from("email_send_log").insert({
    message_id: messageIdKey,
    template_name: "admin_test",
    recipient_email: to,
    status: "sent",
    metadata: { tracking_id: trackingId, cta_url: ctaUrl, resend_id: resendId },
  });
  await logAcquisitionEvent({
    channel: "email", event_type: "sent", provider: "resend",
    provider_event_id: resendId ? `${resendId}:test_send` : null,
    tracking_id: trackingId,
    metadata: { test: true, to, resend_id: resendId },
  });

  return json(200, {
    ok: true,
    delivered: "accepted_by_resend",
    resend_id: resendId,
    to,
    subject,
    cta_url: ctaUrl,
    tracking_id: trackingId,
    email_send_log_message_id: messageIdKey,
    db_status: "sent",
  });
});
