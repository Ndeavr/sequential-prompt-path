// UNPRO — Hardened Resend sender used by health probes, repair, and E2E.
// Validates inputs, requires a tracked CTA, logs failures to email_send_log.
// Surfaces Resend's actual error body instead of swallowing it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sanitizeTags } from "../_shared/resendTags.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const FOUNDER_EMAIL = Deno.env.get("FOUNDER_EMAIL") ?? "danny@unpro.ca";
// Lovable connector keys (lovc_…) must be sent through the Lovable gateway,
// not directly to api.resend.com (which would 401 with "API key is invalid").
const USE_GATEWAY = RESEND_KEY.startsWith("lovc_");
const RESEND_ENDPOINT = USE_GATEWAY
  ? "https://connector-gateway.lovable.dev/resend/emails"
  : "https://api.resend.com/emails";

const sb = createClient(SUPABASE_URL, SRK, { auth: { persistSession: false } });

interface SendInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  cta_url?: string;
  tags?: Record<string, string>;
  message_id?: string;
  template_name?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HREF_RE = /href\s*=\s*"[^"]+"/i;

async function logSend(row: Record<string, unknown>) {
  try { await sb.from("email_send_log").insert(row); } catch (_) { /* never throw */ }
}

async function resolveSender(): Promise<{ from: string; verified: boolean; domain: string | null }> {
  // Canonical sender for UNPRO — never override.
  return { from: "Alex d'UNPRO <alex@mail.unpro.ca>", verified: true, domain: "mail.unpro.ca" };
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const startedAt = Date.now();

  let body: SendInput;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } }); }

  const messageId = body.message_id ?? crypto.randomUUID();
  const template = body.template_name ?? "outreach-resend-send";

  const trimmedKey = (RESEND_KEY ?? "").trim();
  const keyPrefix = trimmedKey.slice(0, 8);

  const fail = async (status: number, reason: string, detail: string, extra: Record<string, unknown> = {}) => {
    await logSend({
      message_id: messageId,
      template_name: template,
      recipient_email: body?.to ?? null,
      status: "email_failed",
      error_message: `${reason}: ${detail}`,
      metadata: { reason, detail, key_prefix: keyPrefix, latency_ms: Date.now() - startedAt, ...extra },
    });
    try {
      await sb.from("outreach_health_state").upsert({
        id: 1,
        resend_key_prefix: keyPrefix || null,
        resend_key_length: (RESEND_KEY ?? "").length || null,
        resend_last_send_status: "failed",
        resend_last_send_at: new Date().toISOString(),
        resend_last_send_error: `${reason}: ${detail}`.slice(0, 500),
      });
    } catch (_) {}
    return new Response(JSON.stringify({ ok: false, reason, detail, key_prefix: keyPrefix, message_id: messageId }), {
      status, headers: { ...cors, "Content-Type": "application/json" },
    });
  };

  // ---- Validation ----
  if (!RESEND_KEY) return fail(500, "MISSING_SECRET", "RESEND_API_KEY not configured");
  if (!body.to || !EMAIL_RE.test(body.to)) return fail(422, "INVALID_RECIPIENT", `to="${body.to ?? ""}"`);
  if (!body.subject || !body.subject.trim()) return fail(422, "MISSING_SUBJECT", "subject empty");
  const html = (body.html ?? "").trim();
  if (!html) return fail(422, "MISSING_HTML", "html empty");
  if (!body.cta_url && !HREF_RE.test(html)) return fail(422, "MISSING_CTA", "no cta_url and no <a href> found in html");
  const text = body.text ?? htmlToText(html);
  if (!text) return fail(422, "MISSING_TEXT_BODY", "text empty after derivation");
  if (USE_GATEWAY && !LOVABLE_API_KEY) {
    return fail(500, "MISSING_SECRET", "LOVABLE_API_KEY missing (required to route lovc_ key through Lovable gateway)");
  }

  // ---- Sender resolution ----
  const sender = await resolveSender();
  if (!sender.verified && body.to.toLowerCase() !== FOUNDER_EMAIL.toLowerCase()) {
    return fail(422, "NO_VERIFIED_DOMAIN",
      `No verified Resend domain. Test sends only allowed to founder (${FOUNDER_EMAIL}).`,
      { sender: sender.from });
  }

  // ---- Live send ----
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (USE_GATEWAY) {
      headers["Authorization"] = `Bearer ${LOVABLE_API_KEY}`;
      headers["X-Connection-Api-Key"] = RESEND_KEY;
    } else {
      headers["Authorization"] = `Bearer ${RESEND_KEY}`;
    }

    // Founder BCC quota — mirrors the next N outreach emails to founder inbox.
    let founderBcc: string | null = null;
    try {
      const { data: bccRow } = await sb.rpc("consume_founder_bcc_email");
      if (typeof bccRow === "string" && bccRow.includes("@")) founderBcc = bccRow;
    } catch (_) { /* mirror is best-effort */ }

    const payload: Record<string, unknown> = {
      from: sender.from,
      to: [body.to],
      subject: body.subject,
      html,
      text,
      tags: sanitizeTags(body.tags),
    };
    if (founderBcc && founderBcc.toLowerCase() !== body.to.toLowerCase()) {
      payload.bcc = [founderBcc];
    }

    const resp = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const raw = await resp.text();
    let parsed: any = null; try { parsed = JSON.parse(raw); } catch { /* keep raw */ }

    if (!resp.ok) {
      const detail = parsed?.message ?? parsed?.error ?? raw.slice(0, 500);
      const name = parsed?.name ?? `HTTP_${resp.status}`;
      return fail(502, "RESEND_PROVIDER_ERROR", detail, {
        http_status: resp.status, resend_name: name, sender: sender.from, via: USE_GATEWAY ? "lovable_gateway" : "direct",
      });
    }

    const id = parsed?.id ?? null;
    await logSend({
      message_id: messageId,
      template_name: template,
      recipient_email: body.to,
      status: "sent",
      metadata: { resend_id: id, sender: sender.from, key_prefix: keyPrefix, latency_ms: Date.now() - startedAt },
    });
    try {
      await sb.from("outreach_health_state").upsert({
        id: 1,
        resend_key_prefix: keyPrefix || null,
        resend_key_length: (RESEND_KEY ?? "").length || null,
        resend_last_send_status: "sent",
        resend_last_send_at: new Date().toISOString(),
        resend_last_send_id: id,
        resend_last_send_error: null,
      });
    } catch (_) {}

    return new Response(JSON.stringify({ ok: true, message_id: messageId, resend_id: id, sender: sender.from, key_prefix: keyPrefix }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return fail(502, "RESEND_NETWORK_ERROR", String(e));
  }
});
