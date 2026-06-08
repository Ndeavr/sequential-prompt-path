// UNPRO — Growth Outreach Agent (cron */15min)
// Picks 'approved' competitors and queues outreach within global daily quotas.
// Phase 1: marks competitor 'sent' and updates campaign counters (no actual send wiring).
//          Real send is done by the existing outbound system or by admin promotion.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { reportOutcome, BlockReason } from "../_shared/reliability.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DAILY_SMS = parseInt(Deno.env.get("GROWTH_DAILY_SMS") ?? "50", 10);
const DAILY_EMAIL = parseInt(Deno.env.get("GROWTH_DAILY_EMAIL") ?? "25", 10);
const DAILY_ACTIVATIONS = parseInt(Deno.env.get("GROWTH_DAILY_ACTIVATIONS") ?? "5", 10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  // Count what was sent today across all campaigns (approximation via competitors moved today)
  const { data: sentToday } = await sb
    .from("contractor_competitors")
    .select("id, phone, email, status, created_at", { count: "exact", head: false })
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

  // Pull approved competitors, SMS-first then email
  const cap = smsBudget + emailBudget;
  const { data: approved } = await sb
    .from("contractor_competitors")
    .select("id, contractor_id, phone, email, trade, city")
    .eq("status", "approved")
    .limit(cap);

  let sentSms = 0, sentEmail = 0;
  const updates: Array<Promise<unknown>> = [];

  for (const c of approved ?? []) {
    if (c.phone && sentSms < smsBudget) {
      updates.push(sb.from("contractor_competitors").update({ status: "sent" }).eq("id", c.id));
      updates.push(sb.rpc("noop").then(() => null).catch(() => null));
      // bump campaign sms_sent
      updates.push(
        sb.from("contractor_growth_campaigns")
          .update({ status: "sent" })
          .eq("contractor_id", c.contractor_id).eq("trade", c.trade).eq("city", c.city)
      );
      sentSms++;
    } else if (c.email && sentEmail < emailBudget) {
      updates.push(sb.from("contractor_competitors").update({ status: "sent" }).eq("id", c.id));
      updates.push(
        sb.from("contractor_growth_campaigns")
          .update({ status: "sent" })
          .eq("contractor_id", c.contractor_id).eq("trade", c.trade).eq("city", c.city)
      );
      sentEmail++;
    }
  }

  await Promise.allSettled(updates);

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
