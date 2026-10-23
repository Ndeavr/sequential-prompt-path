// UNPRO — One-shot backfill: rebuild outreach_email_events + outreach_sms_events
// from the last 30 days of contractor_outreach_logs + email_send_log + acq_sms_logs.
// Idempotent (relies on ON CONFLICT in record_*_event helpers).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { recordEmailEvent, recordSmsEvent } from "../_shared/outreachEvents.ts";
import { ACQ_SMS_LOG_COLUMNS, backfillSmsPayload, type AcqSmsLogRow } from "../_shared/smsAttribution.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let emails = 0, smses = 0;

  // contractor_outreach_logs (channel='email')
  const { data: emailLogs } = await sb
    .from("contractor_outreach_logs")
    .select("id, channel, recipient, contractor_id, template_key, message_body, subject, sent_at, status, provider_message_id, campaign_id, has_tracked_cta")
    .gte("sent_at", since)
    .eq("channel", "email")
    .limit(5000);
  for (const r of emailLogs ?? []) {
    const mid = (r as any).provider_message_id || (r as any).id;
    await recordEmailEvent(mid, "sent", {
      recipient: (r as any).recipient,
      contractor_id: (r as any).contractor_id,
      campaign_id: (r as any).campaign_id,
      template: (r as any).template_key,
      subject: (r as any).subject,
      backfilled: true,
      ts: (r as any).sent_at,
    });
    emails++;
  }

  // email_send_log canonical
  const { data: sendLogs } = await sb
    .from("email_send_log")
    .select("message_id, recipient_email, template_name, status, created_at, error_message")
    .gte("created_at", since)
    .limit(5000);
  for (const r of sendLogs ?? []) {
    const mid = (r as any).message_id;
    if (!mid) continue;
    const status = String((r as any).status ?? "");
    if (status === "sent" || status === "delivered") {
      await recordEmailEvent(mid, status as "sent" | "delivered", {
        recipient: (r as any).recipient_email,
        template: (r as any).template_name,
        ts: (r as any).created_at,
        backfilled: true,
      });
      emails++;
    }
  }

  // acq_sms_logs — real columns; read errors are surfaced, never a silent empty backfill.
  const { data: smsLogs, error: smsReadError } = await sb
    .from("acq_sms_logs")
    .select(ACQ_SMS_LOG_COLUMNS)
    .gte("sent_at", since)
    .limit(5000);
  if (smsReadError) {
    return new Response(JSON.stringify({ ok: false, error: "acq_sms_logs_read_failed", detail: smsReadError.message, emails_backfilled: emails }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  let smsSkipped = 0, smsFailed = 0;
  for (const r of (smsLogs ?? []) as AcqSmsLogRow[]) {
    const item = backfillSmsPayload(r);
    if (!item) { smsSkipped++; continue; }
    const id = await recordSmsEvent(item.sid, "sent", item.payload);
    if (id) smses++; else smsFailed++;
  }
  if (smsFailed > 0) {
    return new Response(JSON.stringify({ ok: false, error: "sms_event_write_failed", sms_failed: smsFailed, sms_backfilled: smses, sms_skipped: smsSkipped, since }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, emails_backfilled: emails, sms_backfilled: smses, since }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
