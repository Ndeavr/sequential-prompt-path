// UNPRO — Growth Outreach Agent (cron */15min)
// Picks 'approved' competitors and ACTUALLY sends SMS via Twilio.
// Truth rules:
//  - Creates a growth_agent_logs row at start and updates with real counts.
//  - Each recipient creates a growth_outbound_messages row.
//  - status='sent' ONLY when Twilio (or email provider) returned a provider_message_id.
//  - On failure: status='failed' + error_message. Never fakes success.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { reportOutcome, BlockReason } from "../_shared/reliability.ts";
import { sendSms as sendSmsCanonical } from "../_shared/twilioSend.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DAILY_SMS = parseInt(Deno.env.get("GROWTH_DAILY_SMS") ?? "50", 10);
const DAILY_EMAIL = parseInt(Deno.env.get("GROWTH_DAILY_EMAIL") ?? "25", 10);

const SMS_TEMPLATE = (firstName: string, company: string, city: string, specialty: string) =>
  `Bonjour ${firstName}, aimeriez-vous que ${company} soit recommandée quand un propriétaire demande à ChatGPT, Gemini ou UNPRO « Quel est le meilleur entrepreneur en ${specialty} à ${city}? » Répondez OUI et je vous montre votre visibilité actuelle gratuitement. — Alex, UNPRO`;

async function sendTwilioSms(to: string, body: string, contractor_id?: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const r = await sendSmsCanonical({ to, body, message_type: "outreach", template_key: "growth_outreach_v1", contractor_id });
  const ok = r.status === "sending" || r.status === "queued";
  return { ok, sid: r.twilio_sid ?? undefined, error: ok ? undefined : (r.error_message ?? r.status) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: logRow } = await sb.from("growth_agent_logs").insert({
    agent_name: "growth-outreach-agent",
    status: "running",
    payload: { DAILY_SMS, DAILY_EMAIL },
  }).select("id").single();
  const logId = logRow?.id;

  const finish = async (patch: Record<string, unknown>) => {
    if (!logId) return;
    await sb.from("growth_agent_logs").update({ ...patch, completed_at: new Date().toISOString() }).eq("id", logId);
  };

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const { count: smsToday } = await sb.from("growth_outbound_messages")
    .select("id", { count: "exact", head: true })
    .eq("channel", "sms").in("status", ["sent", "delivered", "replied", "booked", "activated"])
    .gte("sent_at", todayStart.toISOString());
  const { count: emailToday } = await sb.from("growth_outbound_messages")
    .select("id", { count: "exact", head: true })
    .eq("channel", "email").in("status", ["sent", "delivered", "replied", "booked", "activated"])
    .gte("sent_at", todayStart.toISOString());

  const smsBudget = Math.max(0, DAILY_SMS - (smsToday ?? 0));
  const emailBudget = Math.max(0, DAILY_EMAIL - (emailToday ?? 0));

  if (smsBudget === 0 && emailBudget === 0) {
    await reportOutcome({
      operation: "growth_outreach", outcome: "blocked",
      block_reason: BlockReason.SMS_QUOTA_REACHED,
      payload: { smsToday, emailToday },
    });
    await finish({ status: "blocked", error_message: "daily_quota_reached", input_count: 0 });
    return new Response(JSON.stringify({ ok: true, sent: 0, blocked: "quota_reached" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: approved } = await sb
    .from("contractor_competitors")
    .select("id, contractor_id, competitor_name, trade, city, phone, email")
    .eq("status", "approved")
    .limit(smsBudget + emailBudget);

  const inputCount = approved?.length ?? 0;

  if (inputCount === 0) {
    await finish({
      status: "idle",
      error_message: "no_approved_targets",
      input_count: 0,
    });
    return new Response(JSON.stringify({ ok: true, sent: 0, blocked: "no_approved_targets" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sentSms = 0, sentEmail = 0, generated = 0, failed = 0;

  for (const c of approved ?? []) {
    const firstName = "Bonjour";
    const company = c.competitor_name ?? "votre entreprise";
    const city = c.city ?? "votre ville";
    const specialty = c.trade ?? "votre spécialité";

    // SMS path
    if (c.phone && sentSms < smsBudget) {
      const body = SMS_TEMPLATE(firstName, company, city, specialty);
      const { data: msg } = await sb.from("growth_outbound_messages").insert({
        contractor_id: c.contractor_id, channel: "sms", recipient: c.phone,
        message_body: body, status: "sending",
      }).select("id").single();
      generated++;
      const send = await sendTwilioSms(c.phone, body);
      if (send.ok) {
        await sb.from("growth_outbound_messages").update({
          status: "sent", provider_message_id: send.sid ?? null, sent_at: new Date().toISOString(),
        }).eq("id", msg!.id);
        await sb.from("contractor_competitors").update({ status: "sent" }).eq("id", c.id);
        sentSms++;
      } else {
        await sb.from("growth_outbound_messages").update({
          status: "failed", error_message: send.error,
        }).eq("id", msg!.id);
        failed++;
      }
      continue;
    }

    // Email path — not wired yet; create row in waiting_approval (truth: nothing sent)
    if (c.email && sentEmail < emailBudget) {
      await sb.from("growth_outbound_messages").insert({
        contractor_id: c.contractor_id, channel: "email", recipient: c.email,
        message_body: SMS_TEMPLATE(firstName, company, city, specialty),
        status: "waiting_approval",
        error_message: "email_provider_not_wired_in_growth_outreach",
      });
      generated++;
    }
  }

  const overall = sentSms + sentEmail;
  await reportOutcome({
    operation: "growth_outreach",
    outcome: overall > 0 ? "achieved" : "blocked",
    block_reason: overall > 0 ? null : BlockReason.AWAITING_APPROVAL,
    payload: { sentSms, sentEmail, failed, generated, smsBudget, emailBudget },
  });

  await finish({
    status: overall > 0 ? (failed > 0 ? "partial" : "success") : "blocked",
    input_count: inputCount,
    processed_count: inputCount,
    generated_count: generated,
    sent_count: overall,
    failed_count: failed,
    error_message: overall === 0 ? "no_real_sends_credentials_or_no_phone_recipients" : null,
  });

  return new Response(JSON.stringify({ ok: true, sentSms, sentEmail, failed, generated, inputCount }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
