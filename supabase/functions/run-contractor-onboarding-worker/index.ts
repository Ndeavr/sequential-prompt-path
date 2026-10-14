// UNPRO — Autonomous contractor onboarding worker.
// Runs every 5 minutes via pg_cron. For each due active sequence:
//   1) defensive eligibility checks
//   2) compose the step body, send via sendSms()
//   3) write a contractor_onboarding_messages audit row
//   4) advance current_step / next_send_at
//   5) report a real business outcome (achieved / blocked / pending / failed)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSms } from "../_shared/twilioSend.ts";
import { ONBOARDING_STEPS, TOTAL_STEPS, buildPrivateProfileUrl } from "../_shared/onboardingTemplates.ts";

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
  return Array.from(new Uint8Array(buf))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type RunCounters = {
  leads_checked: number;
  messages_sent: number;
  messages_skipped: number;
  messages_failed: number;
  errors: string[];
};

async function processOne(
  sb: ReturnType<typeof createClient>,
  seq: any,
  counters: RunCounters,
): Promise<void> {
  counters.leads_checked++;
  const lead = seq.contractor_leads;
  if (!lead) {
    await sb.from("onboarding_sequences").update({
      status: "failed",
      stopped_reason: "lead_missing",
    }).eq("id", seq.id);
    counters.messages_skipped++;
    return;
  }

  // Defensive eligibility re-check.
  if (lead.paid_at) {
    await sb.from("onboarding_sequences").update({
      status: "completed_paid",
      stopped_reason: "paid",
    }).eq("id", seq.id);
    counters.messages_skipped++;
    return;
  }
  if (lead.unsubscribed_at) {
    await sb.from("onboarding_sequences").update({
      status: "completed_unsubscribed",
      stopped_reason: "unsubscribed",
    }).eq("id", seq.id);
    counters.messages_skipped++;
    return;
  }

  const phoneRaw = lead.mobile_phone || lead.phone || "";
  const digits = phoneRaw.replace(/\D/g, "");
  if (digits.length < 10) {
    await sb.from("onboarding_sequences").update({
      status: "failed",
      stopped_reason: "invalid_phone",
    }).eq("id", seq.id);
    await sb.from("contractor_onboarding_messages").insert({
      contractor_lead_id: lead.id,
      sequence_id: seq.id,
      step: (seq.current_step ?? 0) + 1,
      channel: "sms",
      to_phone: phoneRaw,
      body: "(not sent)",
      body_hash: "invalid",
      status: "skipped",
      skip_reason: "invalid_phone",
    });
    counters.messages_skipped++;
    return;
  }

  // Per-lead 24h cooldown after first message
  if (lead.last_sms_at) {
    const last = new Date(lead.last_sms_at).getTime();
    if (Date.now() - last < DAY_MS) {
      // push next_send_at to last + 24h
      const next = new Date(last + DAY_MS).toISOString();
      await sb.from("onboarding_sequences").update({ next_send_at: next }).eq("id", seq.id);
      counters.messages_skipped++;
      return;
    }
  }

  const nextStepIdx = (seq.current_step ?? 0); // index into ONBOARDING_STEPS
  if (nextStepIdx >= TOTAL_STEPS) {
    await sb.from("onboarding_sequences").update({
      status: "waiting",
      stopped_reason: "max_steps_reached",
    }).eq("id", seq.id);
    return;
  }

  const stepDef = ONBOARDING_STEPS[nextStepIdx];
  const privateUrl = buildPrivateProfileUrl(lead.onboarding_token, lead.id);
  const body = stepDef.body({
    business_name: lead.company_name || lead.full_name || "votre entreprise",
    private_profile_url: privateUrl,
  });
  const bodyHash = await hashBody(body);

  // 7-day duplicate body+phone guard
  const sinceIso = new Date(Date.now() - DEDUPE_WINDOW_DAYS * DAY_MS).toISOString();
  const { count: dupCount } = await sb
    .from("contractor_onboarding_messages")
    .select("id", { count: "exact", head: true })
    .eq("to_phone", phoneRaw)
    .eq("body_hash", bodyHash)
    .gte("sent_at", sinceIso);
  if ((dupCount ?? 0) > 0) {
    await sb.from("contractor_onboarding_messages").insert({
      contractor_lead_id: lead.id,
      sequence_id: seq.id,
      step: stepDef.step,
      channel: "sms",
      to_phone: phoneRaw,
      body,
      body_hash: bodyHash,
      status: "skipped",
      skip_reason: "duplicate_body_7d",
    });
    // Bump 24h
    await sb.from("onboarding_sequences").update({
      next_send_at: new Date(Date.now() + DAY_MS).toISOString(),
    }).eq("id", seq.id);
    counters.messages_skipped++;
    return;
  }

  // Send via canonical sender (handles send window + Twilio)
  const result = await sendSms({
    to: phoneRaw,
    body,
    message_type: "onboarding",
    template_key: `onboarding_step_${stepDef.step}`,
    lead_id: lead.id,
    contractor_id: lead.contractor_id ?? undefined,
    metadata: { sequence_id: seq.id, step: stepDef.step },
    attempt_number: 1,
  });

  if (result.status === "deferred_window") {
    // Send window blocked — defer to next_send_at returned by sender.
    const next = result.error_message?.replace("next_send_at=", "") ||
      new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await sb.from("contractor_onboarding_messages").insert({
      contractor_lead_id: lead.id,
      sequence_id: seq.id,
      step: stepDef.step,
      channel: "sms",
      to_phone: phoneRaw,
      body,
      body_hash: bodyHash,
      status: "skipped",
      skip_reason: "out_of_window",
    });
    await sb.from("onboarding_sequences").update({ next_send_at: next }).eq("id", seq.id);
    counters.messages_skipped++;
    return;
  }

  if (result.status === "sending" || result.status === "sent") {
    const nowIso = new Date().toISOString();
    await sb.from("contractor_onboarding_messages").insert({
      contractor_lead_id: lead.id,
      sequence_id: seq.id,
      step: stepDef.step,
      channel: "sms",
      to_phone: phoneRaw,
      body,
      body_hash: bodyHash,
      status: "sent",
      twilio_message_sid: result.twilio_sid,
      sent_at: nowIso,
    });

    const newStep = (seq.current_step ?? 0) + 1;
    const done = newStep >= TOTAL_STEPS;
    await sb.from("onboarding_sequences").update({
      current_step: newStep,
      last_sent_at: nowIso,
      next_send_at: done
        ? null
        : new Date(Date.now() + ONBOARDING_STEPS[newStep].delay_hours * 60 * 60 * 1000).toISOString(),
      status: done ? "waiting" : "active",
      stopped_reason: done ? "completed_sequence" : null,
    }).eq("id", seq.id);

    await sb.from("contractor_leads").update({
      last_sms_at: nowIso,
      last_sms_status: "sent",
      pipeline_status: lead.pipeline_status === "ready_for_outreach" ? "contacted" : lead.pipeline_status,
    }).eq("id", lead.id);

    counters.messages_sent++;
    return;
  }

  // Failure path
  await sb.from("contractor_onboarding_messages").insert({
    contractor_lead_id: lead.id,
    sequence_id: seq.id,
    step: stepDef.step,
    channel: "sms",
    to_phone: phoneRaw,
    body,
    body_hash: bodyHash,
    status: "failed",
    error_message: result.error_message ?? result.status,
  });
  await sb.from("contractor_leads").update({ last_sms_status: "failed" }).eq("id", lead.id);
  // Retry in 30m
  await sb.from("onboarding_sequences").update({
    next_send_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }).eq("id", seq.id);
  counters.messages_failed++;
  counters.errors.push(`lead=${lead.id} ${result.error_code ?? ""} ${result.error_message ?? ""}`.trim());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const triggeredBy = req.headers.get("x-trigger") || "cron";

  const { data: runRow } = await sb.from("agent_runs").insert({
    agent_name: "contractor_onboarding_worker",
    status: "running",
    triggered_by: triggeredBy,
    input: {},
  }).select("id").single();
  const runId = runRow?.id;

  const counters: RunCounters = {
    leads_checked: 0,
    messages_sent: 0,
    messages_skipped: 0,
    messages_failed: 0,
    errors: [],
  };

  let terminalStatus: "ok" | "blocked" | "no_eligible_leads" | "error" = "ok";
  let terminalMessage: string | null = null;

  try {
    // Honour the global pause flag.
    const { data: settings } = await sb
      .from("outbound_global_settings")
      .select("outreach_paused,max_daily_per_mailbox")
      .limit(1)
      .maybeSingle();
    if (settings?.outreach_paused) {
      terminalStatus = "blocked";
      terminalMessage = "outreach_paused";
    } else {
      // Enforce a daily cap across the autonomous worker only.
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const { count: sentToday } = await sb
        .from("contractor_onboarding_messages")
        .select("id", { count: "exact", head: true })
        .gte("sent_at", startOfDay.toISOString())
        .eq("status", "sent");
      const cap = Math.max(settings?.max_daily_per_mailbox ?? GLOBAL_DAILY_CAP, GLOBAL_DAILY_CAP);
      if ((sentToday ?? 0) >= cap) {
        terminalStatus = "blocked";
        terminalMessage = `daily_cap_reached:${sentToday}/${cap}`;
      } else {
        const remaining = cap - (sentToday ?? 0);

        const { data: due, error: dueErr } = await sb
          .from("onboarding_sequences")
          .select("id,current_step,next_send_at,status,contractor_leads(id,company_name,full_name,phone,mobile_phone,contractor_id,onboarding_token,paid_at,unsubscribed_at,last_sms_at,pipeline_status)")
          .eq("status", "active")
          .lte("next_send_at", new Date().toISOString())
          .order("next_send_at", { ascending: true })
          .limit(Math.min(BATCH_LIMIT, remaining));

        if (dueErr) throw new Error(`due_query_failed: ${dueErr.message}`);

        if (!due || due.length === 0) {
          terminalStatus = "no_eligible_leads";
        } else {
          for (const seq of due) {
            if (counters.messages_sent >= remaining) break;
            try {
              await processOne(sb, seq, counters);
            } catch (e) {
              counters.messages_failed++;
              counters.errors.push(`seq=${seq.id} ${(e as Error).message}`);
            }
          }
          if (counters.messages_sent === 0 && counters.leads_checked > 0) {
            terminalStatus = "blocked";
            terminalMessage = "eligible_but_all_blocked";
          }
        }
      }
    }
  } catch (e) {
    terminalStatus = "error";
    terminalMessage = (e as Error).message;
    counters.errors.push(terminalMessage);
  }

  const finalStatus = terminalStatus === "ok"
    ? "ok"
    : terminalStatus === "no_eligible_leads"
      ? "ok"
      : terminalStatus === "blocked"
        ? "blocked"
        : "error";

  if (runId) {
    await sb.from("agent_runs").update({
      status: finalStatus,
      finished_at: new Date().toISOString(),
      output: {
        terminal: terminalStatus,
        terminal_message: terminalMessage,
        leads_checked: counters.leads_checked,
        messages_sent: counters.messages_sent,
        messages_skipped: counters.messages_skipped,
        messages_failed: counters.messages_failed,
        errors: counters.errors.slice(0, 20),
      },
      error: counters.errors.length > 0 ? counters.errors[0] : null,
    }).eq("id", runId);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      run_id: runId,
      terminal: terminalStatus,
      ...counters,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
