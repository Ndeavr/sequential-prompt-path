// UNPRO — One-shot backfill: rebuild outreach_email_events + outreach_sms_events
// from the last 30 days of contractor_outreach_logs + email_send_log + acq_sms_logs.
// Idempotent (relies on ON CONFLICT in record_*_event helpers).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { recordEmailEvent, recordSmsEvent } from "../_shared/outreachEvents.ts";

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

  // acq_sms_logs (or sms_events_v2)
  const { data: smsLogs } = await sb
    .from("acq_sms_logs")
    .select("id, contractor_id, phone, status, twilio_sid, sent_at, body, error_code, error_message")
    .gte("sent_at", since)
    .limit(5000);
  for (const r of smsLogs ?? []) {
    const sid = (r as any).twilio_sid || (r as any).id;
    if (!sid) continue;
    await recordSmsEvent(sid, "sent", {
      recipient: (r as any).phone,
      contractor_id: (r as any).contractor_id,
      body: (r as any).body,
      status: (r as any).status,
      error_code: (r as any).error_code,
      error: (r as any).error_message,
      ts: (r as any).sent_at,
      backfilled: true,
    });
    smses++;
  }

  return new Response(JSON.stringify({ ok: true, emails_backfilled: emails, sms_backfilled: smses, since }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
