// UNPRO — Curiosity funnel SMS worker. Runs every 5 minutes via pg_cron.
// Mirrors run-contractor-onboarding-worker shape but targets curiosity_sequences
// and logs every send into curiosity_funnel_events for end-to-end attribution.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSms } from "../_shared/twilioSend.ts";
import { CURIOSITY_STEPS, CURIOSITY_TOTAL_STEPS, buildCuriosityUrl } from "../_shared/curiosityTemplates.ts";
import { gateLeadForOutreach } from "../_shared/leadValidation.ts";
import { callCommercialSendGate } from "../_shared/caslEvidence.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DAY_MS = 24 * 60 * 60 * 1000;
const GLOBAL_DAILY_CAP = 50;
const DEDUPE_WINDOW_DAYS = 7;
const BATCH_LIMIT = 200;

async function hashBody(body: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  return Array.from(new Uint8Array(buf)).slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Counters = {
  leads_checked: number;
  messages_sent: number;
  messages_skipped: number;
  messages_failed: number;
  errors: string[];
};

async function processOne(sb: ReturnType<typeof createClient>, seq: any, c: Counters) {
  c.leads_checked++;
  const lead = seq.contractor_leads;
  if (!lead) {
    await sb.from("curiosity_sequences").update({ status: "failed", failure_code: "lead_missing" }).eq("id", seq.id);
    c.messages_skipped++; return;
  }
  if (lead.paid_at) {
    await sb.from("curiosity_sequences").update({ status: "completed_paid" }).eq("id", seq.id);
    c.messages_skipped++; return;
  }
  if (lead.unsubscribed_at) {
    await sb.from("curiosity_sequences").update({ status: "completed_unsubscribed" }).eq("id", seq.id);
    c.messages_skipped++; return;
  }
  // Click → activation stop: once clicked, pause sequence
  if (seq.clicked_at && new Date(seq.clicked_at).getTime() < Date.now() - 1000) {
    await sb.from("curiosity_sequences").update({ status: "completed_clicked" }).eq("id", seq.id);
    c.messages_skipped++; return;
  }

  // HARD GATE: unified validation (company + phone + dedupe + confidence)
  const blockReason = gateLeadForOutreach(lead);
  if (blockReason) {
    await sb.from("curiosity_sequences").update({
      status: "failed",
      failure_code: blockReason,
    }).eq("id", seq.id);
    await sb.from("curiosity_funnel_events").insert({
      lead_id: lead.id,
      slug: lead.curiosity_slug,
      event_type: "sms_blocked",
      metadata: {
        reason: blockReason,
        stage: "pre_queue",
        validation_status: lead.validation_status,
        phone_failure_reason: lead.phone_failure_reason,
        company_failure_reason: lead.company_failure_reason,
        phone_score: lead.phone_confidence_score,
        company_score: lead.company_confidence_score,
      },
    });
    c.messages_skipped++; return;
  }

  const phoneRaw = lead.phone_e164 || lead.mobile_phone || lead.phone || "";

  if (!lead.curiosity_slug || !lead.curiosity_token) {
    await sb.from("curiosity_sequences").update({ status: "failed", failure_code: "missing_slug" }).eq("id", seq.id);
    c.messages_skipped++; return;
  }

  const stepIdx = (seq.current_step ?? 1) - 1;
  if (stepIdx >= CURIOSITY_TOTAL_STEPS) {
    await sb.from("curiosity_sequences").update({ status: "waiting" }).eq("id", seq.id);
    return;
  }

  const def = CURIOSITY_STEPS[stepIdx];
  const url = buildCuriosityUrl(lead.curiosity_slug, lead.curiosity_token);
  const body = def.body({ first_name: lead.first_name, business_name: lead.company_name, url });
  const bodyHash = await hashBody(body);

  // 7-day dedupe across curiosity funnel
  const sinceIso = new Date(Date.now() - DEDUPE_WINDOW_DAYS * DAY_MS).toISOString();
  const { count: dup } = await sb
    .from("curiosity_funnel_events")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", lead.id)
    .eq("event_type", "sms_sent")
    .gte("created_at", sinceIso)
    .filter("metadata->>body_hash", "eq", bodyHash);
  if ((dup ?? 0) > 0) {
    await sb.from("curiosity_sequences").update({
      next_send_at: new Date(Date.now() + DAY_MS).toISOString(),
    }).eq("id", seq.id);
    c.messages_skipped++; return;
  }

  const result = await sendSms({
    to: phoneRaw,
    body,
    message_type: "outreach",
    template_key: `curiosity_step_${def.step}`,
    lead_id: lead.id,
    metadata: { sequence_id: seq.id, step: def.step, funnel: "ai_score_curiosity" },
    attempt_number: 1,
  });

  if (result.status === "deferred_window") {
    const next = result.error_message?.startsWith("next_send_at=")
      ? result.error_message.replace("next_send_at=", "")
      : new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await sb.from("curiosity_sequences").update({ next_send_at: next }).eq("id", seq.id);
    c.messages_skipped++; return;
  }

  if (result.status === "sending" || result.status === "sent") {
    const nowIso = new Date().toISOString();
    await sb.from("curiosity_funnel_events").insert({
      lead_id: lead.id,
      slug: lead.curiosity_slug,
      event_type: "sms_sent",
      metadata: { step: def.step, twilio_sid: result.twilio_sid, body_hash: bodyHash },
    });

    const newStep = (seq.current_step ?? 1) + 1;
    const done = newStep > CURIOSITY_TOTAL_STEPS;
    await sb.from("curiosity_sequences").update({
      current_step: newStep,
      last_sent_at: nowIso,
      next_send_at: done ? null : new Date(Date.now() + CURIOSITY_STEPS[newStep - 1].delay_hours * 60 * 60 * 1000).toISOString(),
      status: done ? "waiting" : "active",
    }).eq("id", seq.id);

    await sb.from("contractor_leads").update({
      last_sms_at: nowIso,
      last_sms_status: "sent",
    }).eq("id", lead.id);

    c.messages_sent++;
    return;
  }

  // Failure
  await sb.from("curiosity_funnel_events").insert({
    lead_id: lead.id,
    slug: lead.curiosity_slug,
    event_type: "sms_failed",
    metadata: { step: def.step, error_code: result.error_code, error_message: result.error_message },
  });
  await sb.from("curiosity_sequences").update({
    next_send_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }).eq("id", seq.id);
  c.messages_failed++;
  c.errors.push(`lead=${lead.id} ${result.error_code ?? ""} ${result.error_message ?? ""}`.trim());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const counters: Counters = { leads_checked: 0, messages_sent: 0, messages_skipped: 0, messages_failed: 0, errors: [] };
  let terminal: "ok" | "blocked" | "no_eligible" | "error" = "ok";
  let terminalMsg: string | null = null;

  try {
    const { data: settings } = await sb.from("outbound_global_settings")
      .select("outreach_paused,max_daily_per_mailbox").limit(1).maybeSingle();
    if (settings?.outreach_paused) {
      terminal = "blocked"; terminalMsg = "outreach_paused";
    } else {
      const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
      const { count: sentToday } = await sb
        .from("curiosity_funnel_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfDay.toISOString())
        .eq("event_type", "sms_sent");
      const cap = Math.max(settings?.max_daily_per_mailbox ?? GLOBAL_DAILY_CAP, GLOBAL_DAILY_CAP);
      if ((sentToday ?? 0) >= cap) {
        terminal = "blocked"; terminalMsg = `daily_cap_reached:${sentToday}/${cap}`;
      } else {
        const remaining = cap - (sentToday ?? 0);
        const { data: due, error: dueErr } = await sb
          .from("curiosity_sequences")
          .select("id,current_step,next_send_at,status,clicked_at,contractor_leads(id,first_name,company_name,phone,mobile_phone,phone_e164,phone_validation_status,phone_failure_reason,validation_status,company_failure_reason,company_confidence_score,phone_confidence_score,do_not_contact,paid_at,unsubscribed_at,curiosity_slug,curiosity_token)")
          .eq("status", "active")
          .lte("next_send_at", new Date().toISOString())
          .order("next_send_at", { ascending: true })
          .limit(Math.min(BATCH_LIMIT, remaining));
        if (dueErr) throw new Error(`due_query_failed: ${dueErr.message}`);
        if (!due || due.length === 0) { terminal = "no_eligible"; }
        else {
          for (const seq of due) {
            if (counters.messages_sent >= remaining) break;
            try { await processOne(sb, seq, counters); }
            catch (e) {
              counters.messages_failed++;
              counters.errors.push(`seq=${seq.id} ${(e as Error).message}`);
            }
          }
        }
      }
    }
  } catch (e) {
    terminal = "error"; terminalMsg = (e as Error).message;
    counters.errors.push(terminalMsg);
  }

  return new Response(JSON.stringify({ ok: true, terminal, terminal_message: terminalMsg, ...counters }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
