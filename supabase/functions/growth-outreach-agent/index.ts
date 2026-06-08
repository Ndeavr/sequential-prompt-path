// UNPRO — Growth Outreach Agent (cron */15min)
// Picks 'approved' competitors and marks 'sent' within global daily quotas.
// Phase 1: stages outreach. Actual send wiring uses the existing outbound system.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { reportOutcome, BlockReason } from "../_shared/reliability.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DAILY_SMS = parseInt(Deno.env.get("GROWTH_DAILY_SMS") ?? "50", 10);
const DAILY_EMAIL = parseInt(Deno.env.get("GROWTH_DAILY_EMAIL") ?? "25", 10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const { data: sentToday } = await sb
    .from("contractor_competitors")
    .select("id, phone, email")
    .eq("status", "sent")
    .gte("created_at", todayStart.toISOString());

  const smsToday = (sentToday ?? []).filter((r) => r.phone).length;
  const emailToday = (sentToday ?? []).filter((r) => r.email && !r.phone).length;

  const smsBudget = Math.max(0, DAILY_SMS - smsToday);
  const emailBudget = Math.max(0, DAILY_EMAIL - emailToday);

  if (smsBudget === 0 && emailBudget === 0) {
    await reportOutcome({
      operation: "growth_outreach", outcome: "blocked",
      block_reason: BlockReason.SMS_QUOTA_REACHED,
      payload: { smsToday, emailToday, DAILY_SMS, DAILY_EMAIL },
    });
    return new Response(JSON.stringify({ ok: true, sent: 0, blocked: "quota_reached" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: approved } = await sb
    .from("contractor_competitors")
    .select("id, contractor_id, phone, email")
    .eq("status", "approved")
    .limit(smsBudget + emailBudget);

  let sentSms = 0, sentEmail = 0;
  const sentIds: string[] = [];
  const bumpCampaigns: Record<string, { sms: number; email: number }> = {};

  for (const c of approved ?? []) {
    if (c.phone && sentSms < smsBudget) {
      sentIds.push(c.id);
      bumpCampaigns[c.contractor_id] ??= { sms: 0, email: 0 };
      bumpCampaigns[c.contractor_id].sms += 1;
      sentSms++;
    } else if (c.email && sentEmail < emailBudget) {
      sentIds.push(c.id);
      bumpCampaigns[c.contractor_id] ??= { sms: 0, email: 0 };
      bumpCampaigns[c.contractor_id].email += 1;
      sentEmail++;
    }
  }

  if (sentIds.length) {
    await sb.from("contractor_competitors").update({ status: "sent" }).in("id", sentIds);
  }

  for (const [contractorId, b] of Object.entries(bumpCampaigns)) {
    const { data: camp } = await sb.from("contractor_growth_campaigns")
      .select("id, sms_sent, emails_sent")
      .eq("contractor_id", contractorId)
      .order("created_at", { ascending: false })
      .limit(1).maybeSingle();
    if (camp) {
      await sb.from("contractor_growth_campaigns").update({
        sms_sent: (camp.sms_sent ?? 0) + b.sms,
        emails_sent: (camp.emails_sent ?? 0) + b.email,
        status: "sent",
      }).eq("id", camp.id);
    }
  }

  await reportOutcome({
    operation: "growth_outreach",
    outcome: (sentSms + sentEmail) > 0 ? "achieved" : "blocked",
    block_reason: (sentSms + sentEmail) > 0 ? null : BlockReason.AWAITING_APPROVAL,
    payload: { sentSms, sentEmail, smsBudget, emailBudget },
  });

  return new Response(JSON.stringify({ ok: true, sentSms, sentEmail, smsBudget, emailBudget }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
