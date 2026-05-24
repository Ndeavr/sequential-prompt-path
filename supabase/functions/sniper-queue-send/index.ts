// sniper-queue-send — REAL sends via Resend (email) + Twilio (SMS)
// Drains sniper_targets with outreach_status='message_ready' and a selected variant.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev";

// Send via Lovable Emails queue (verified sender: notify.unpro.ca)
async function sendEmail(params: {
  supabase: any;
  to: string;
  subject: string;
  text: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const messageId = crypto.randomUUID();
  const senderDomain = (params.fromEmail.split("@")[1] || "notify.unpro.ca").toLowerCase();
  const fromAddress = `${params.fromName} <${params.fromEmail}>`;
  const escaped = params.text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Inter,sans-serif;font-size:15px;line-height:1.55;color:#111;background:#fff;padding:24px;">${
    escaped.split(/\n{2,}/).map(p => `<p style="margin:0 0 14px 0;">${p.replace(/\n/g, "<br/>")}</p>`).join("")
  }</body></html>`;

  await params.supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: "sniper_outreach",
    recipient_email: params.to,
    status: "pending",
  });

  const { error: enqueueError } = await params.supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: params.to,
      from: fromAddress,
      sender_domain: senderDomain,
      subject: params.subject,
      html,
      text: params.text,
      reply_to: params.replyTo,
      purpose: "transactional",
      label: "sniper_outreach",
      idempotency_key: `sniper-${messageId}`,
      queued_at: new Date().toISOString(),
    },
  });
  if (enqueueError) return { ok: false, error: `enqueue: ${enqueueError.message}` };
  return { ok: true, id: messageId };
}

async function sendSms(params: { to: string; body: string }): Promise<{ ok: boolean; id?: string; error?: string }> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const twilioKey = Deno.env.get("TWILIO_API_KEY");
  const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  if (!lovableKey || !twilioKey) return { ok: false, error: "Missing LOVABLE_API_KEY or TWILIO_API_KEY" };
  if (!messagingServiceSid) return { ok: false, error: "Missing TWILIO_MESSAGING_SERVICE_SID" };

  const body = new URLSearchParams({
    To: params.to,
    MessagingServiceSid: messagingServiceSid,
    Body: params.body,
  });
  const res = await fetch(`${GATEWAY}/twilio/Messages.json`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: `Twilio ${res.status}: ${JSON.stringify(data).slice(0, 300)}` };
  return { ok: true, id: data?.sid };
}

function normalizePhoneE164(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 10) return `+${digits}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const body = await req.json().catch(() => ({} as any));
    const targetId: string | null = body.targetId || null;
    const batchSize: number = body.batchSize || 10;
    const dryRun: boolean = body.dryRun === true;

    // Pick any verified mailbox (prefer api_lovable, fall back to first verified)
    const { data: mailboxes } = await supabase
      .from("outbound_mailboxes")
      .select("*")
      .eq("mailbox_status", "verified")
      .order("connection_type", { ascending: false });
    const mailbox = (mailboxes || []).find((m: any) => m.connection_type === "api_lovable")
      ?? (mailboxes || [])[0]
      ?? null;

    let targetIds: string[] = [];
    if (targetId) {
      targetIds = [targetId];
    } else {
      const { data: ready } = await supabase
        .from("sniper_targets")
        .select("id")
        .eq("outreach_status", "message_ready")
        .limit(batchSize);
      targetIds = (ready || []).map((t: any) => t.id);
    }

    const results: any[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const tid of targetIds) {
      const { data: variant } = await supabase
        .from("sniper_message_variants")
        .select("*")
        .eq("sniper_target_id", tid)
        .eq("is_selected", true)
        .limit(1)
        .maybeSingle();
      if (!variant) { results.push({ tid, skipped: "no_variant" }); continue; }

      const { data: target } = await supabase
        .from("sniper_targets")
        .select("business_name, email, phone, recommended_channel")
        .eq("id", tid)
        .maybeSingle();
      if (!target) { results.push({ tid, skipped: "no_target" }); continue; }

      // Dedup: skip if already sent / queued on same channel
      const { data: existing } = await supabase
        .from("sniper_send_queue")
        .select("id")
        .eq("sniper_target_id", tid)
        .eq("channel", variant.channel)
        .in("send_status", ["queued", "sent", "delivered"])
        .limit(1);
      if (existing && existing.length > 0) { results.push({ tid, skipped: "already_sent" }); continue; }

      let destination: string | null = null;
      let providerResult: { ok: boolean; id?: string; error?: string };
      let provider: string;

      if (variant.channel === "email") {
        destination = target.email;
        if (!destination) { results.push({ tid, skipped: "no_email" }); continue; }
        if (!mailbox) { results.push({ tid, skipped: "no_verified_mailbox" }); continue; }
        provider = "resend";
        if (dryRun) {
          providerResult = { ok: true, id: `dry-${crypto.randomUUID()}` };
        } else {
          providerResult = await sendEmail({
            to: destination,
            subject: variant.subject_line || `UNPRO — ${target.business_name}`,
            text: variant.message_body,
            fromName: mailbox.sender_name,
            fromEmail: mailbox.sender_email,
            replyTo: mailbox.reply_to_email || undefined,
          });
        }
      } else if (variant.channel === "sms") {
        destination = normalizePhoneE164(target.phone || "");
        if (!destination) { results.push({ tid, skipped: "invalid_phone" }); continue; }
        provider = "twilio";
        if (dryRun) {
          providerResult = { ok: true, id: `dry-${crypto.randomUUID()}` };
        } else {
          providerResult = await sendSms({ to: destination, body: variant.message_body });
        }
      } else {
        results.push({ tid, skipped: `unknown_channel:${variant.channel}` });
        continue;
      }

      const now = new Date().toISOString();
      await supabase.from("sniper_send_queue").insert({
        sniper_target_id: tid,
        message_variant_id: variant.id,
        channel: variant.channel,
        destination,
        send_status: providerResult.ok ? "sent" : "failed",
        provider,
        provider_message_id: providerResult.id || null,
        sent_at: providerResult.ok ? now : null,
        failed_at: providerResult.ok ? null : now,
        error_message: providerResult.error || null,
      });

      await supabase.from("sniper_engagement_events").insert({
        sniper_target_id: tid,
        event_name: providerResult.ok
          ? (variant.channel === "sms" ? "sms_sent" : "email_sent")
          : (variant.channel === "sms" ? "sms_failed" : "email_failed"),
        event_props: { variant_type: variant.variant_type, provider, error: providerResult.error },
      });

      if (providerResult.ok) {
        await supabase.from("sniper_targets").update({
          outreach_status: "sent",
          updated_at: now,
        }).eq("id", tid);

        // Increment mailbox counter for email
        if (variant.channel === "email" && mailbox) {
          await supabase.from("outbound_mailboxes").update({
            sent_today: (mailbox.sent_today || 0) + 1,
          }).eq("id", mailbox.id);
        }
        sentCount++;
      } else {
        failedCount++;
      }

      results.push({
        tid,
        channel: variant.channel,
        destination,
        ok: providerResult.ok,
        provider_message_id: providerResult.id,
        error: providerResult.error,
      });
    }

    return new Response(JSON.stringify({
      total: targetIds.length,
      sent: sentCount,
      failed: failedCount,
      dry_run: dryRun,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
