/**
 * launch-agent-outreach — SCORED → MESSAGED.
 * Generates personalized SMS using template + lead data, sends via existing Twilio path.
 * Founder Mode bypasses quota guards.
 */
import { assertSmsHealthy } from "../_shared/smsHealth.ts";
import { corsHeaders, adminClient, transitionLead, logLaunchEvent, isFounderModeActive } from "../_shared/launch.ts";
import { reportOutcome, FailureCode, BlockReason } from "../_shared/reliability.ts";
import { sendSms as sendSmsCanonical } from "../_shared/twilioSend.ts";
import { callCommercialSendGate } from "../_shared/caslEvidence.ts";

function firstName(name?: string | null): string {
  if (!name) return "Bonjour";
  return name.split(/\s+/)[0];
}

function buildSms(lead: any): string {
  const fn = firstName(lead.company_name);
  const company = lead.company_name ?? "votre entreprise";
  const city = lead.city ?? "votre région";
  const trade = lead.trade ?? "votre métier";
  return `${fn}, êtes-vous certain que ChatGPT, Gemini et Google AI recommandent ${company} lorsqu'un propriétaire cherche un expert en ${trade} à ${city}? — UNPRO`;
}

async function sendSms(to: string, body: string, lead_id?: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const r = await sendSmsCanonical({ to, body, message_type: "outreach", template_key: "launch_outreach_v1", lead_id });
  const ok = r.status === "sending" || r.status === "queued";
  return { ok, sid: r.twilio_sid ?? undefined, error: ok ? undefined : (r.error_message ?? r.status) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const __health = await assertSmsHealthy();
  if (!__health.ok) return new Response(JSON.stringify({ ok: false, blocked: true, reason: __health.reason, health: __health.health }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const body = await req.json().catch(() => ({}));
  const batch = Math.min(Number(body.batch ?? 30), 50);
  const sb = adminClient();
  const founder = await isFounderModeActive();

  const { data: leads } = await sb
    .from("launch_leads")
    .select("*")
    .in("lead_status", ["SCORED", "ENRICHED"])
    .order("last_event_at", { ascending: true })
    .limit(batch);

  let sent = 0, blocked = 0, failed = 0;
  for (const lead of leads ?? []) {
    const phone = (lead as any).phone;
    if (!phone) {
      await sb.from("launch_leads").update({
        lead_status: "BLOCKED", block_reason: "NO_PHONE", last_event_at: new Date().toISOString(),
      }).eq("id", (lead as any).id);
      blocked++;
      continue;
    }

    try {
      await transitionLead((lead as any).id, "MESSAGING", {}, "launch-agent-outreach");

      // ── Resolve/attach a canonical contractor_leads row ────────────────
      // The CASL gate requires an existing contractor_leads id (its FK target
      // for evidence). launch_leads is a separate discovery table, so we
      // upsert-map the destination phone to a contractor_leads row before
      // calling the gate. If none exists AND cannot be created (missing
      // required identity), we block with a clear observable reason instead
      // of cascading the misleading `lead_not_found` error.
      const normalizedPhone = String(phone).replace(/\D/g, "").slice(-10);
      const phoneE164 = normalizedPhone.length === 10 ? `+1${normalizedPhone}` : phone;
      let contractorLeadId: string | null = null;
      {
        const { data: existing } = await sb
          .from("contractor_leads")
          .select("id")
          .eq("phone_e164", phoneE164)
          .limit(1)
          .maybeSingle();
        if (existing?.id) {
          contractorLeadId = existing.id as string;
        } else if ((lead as any).company_name) {
          const { data: inserted } = await sb
            .from("contractor_leads")
            .insert({
              company_name: (lead as any).company_name,
              phone: phone,
              phone_e164: phoneE164,
              email: (lead as any).email ?? null,
              city: (lead as any).city ?? null,
              trade: (lead as any).trade ?? null,
              category_primary: (lead as any).trade ?? null,
              source_type: "launch_leads",
              source_ref: (lead as any).id,
              pipeline_status: "scraped",
            })
            .select("id")
            .maybeSingle();
          contractorLeadId = inserted?.id ?? null;
        }
      }
      if (!contractorLeadId) {
        blocked++;
        await sb.from("launch_leads").update({
          lead_status: "BLOCKED",
          block_reason: "NO_MATCHING_CONTRACTOR_LEAD",
          last_event_at: new Date().toISOString(),
        }).eq("id", (lead as any).id);
        await logLaunchEvent({
          lead_id: (lead as any).id, agent: "launch-agent-outreach", event: "gate_block",
          success: false, message: "no_matching_contractor_lead",
        });
        continue;
      }

      // ── CASL / suppression gate — commercial outreach ONLY ─────────────
      const gate = await callCommercialSendGate({
        contractor_lead_id: contractorLeadId,
        destination_type: "phone_sms",
        destination: phone,
        campaign_id: (lead as any).campaign_id ?? null,
        sender_identity: { name: "UNPRO", unsubscribe_footer: true },
      });
      if (!gate.pass) {
        blocked++;
        await sb.from("launch_leads").update({
          lead_status: "BLOCKED",
          block_reason: `CASL_GATE:${gate.blocked_reasons.join(",") || "unknown"}`,
          last_event_at: new Date().toISOString(),
        }).eq("id", (lead as any).id);
        await logLaunchEvent({
          lead_id: (lead as any).id, agent: "launch-agent-outreach", event: "gate_block",
          success: false, message: gate.blocked_reasons.join(","), payload: { decisions: gate.decisions },
        });
        continue;
      }

      const sms = buildSms(lead);
      const r = await sendSms(phone, sms, (lead as any).id);
      if (r.ok) {
        await transitionLead((lead as any).id, "MESSAGED", {
          attempts: ((lead as any).attempts ?? 0) + 1,
          payload: {
            ...((lead as any).payload ?? {}),
            outreach: {
              message: sms, sid: r.sid, sent_at: new Date().toISOString(), founder_mode: founder,
              casl_evidence_id: gate.evidence_id, gate_decisions: gate.decisions,
            },
          },
        }, "launch-agent-outreach");
        sent++;

        // Schedule follow-ups J+2 / J+5 / J+10
        const now = Date.now();
        const days = [2, 5, 10];
        await sb.from("launch_followup_schedule").insert(
          days.map((d, i) => ({
            lead_id: (lead as any).id,
            attempt_number: i + 1,
            due_at: new Date(now + d * 24 * 3600 * 1000).toISOString(),
          })),
        );
      } else {
        failed++;
        await sb.from("launch_leads").update({
          lead_status: "FAILED",
          failure_code: FailureCode.TWILIO_PROVIDER_ERROR,
          last_event_at: new Date().toISOString(),
        }).eq("id", (lead as any).id);
        await logLaunchEvent({
          lead_id: (lead as any).id, agent: "launch-agent-outreach", event: "sms_failed",
          success: false, message: r.error,
        });
      }
    } catch (e) {
      failed++;
      await logLaunchEvent({
        lead_id: (lead as any).id, agent: "launch-agent-outreach", event: "send_exception",
        success: false, message: String(e),
      });
    }
  }

  await reportOutcome({
    operation: "launch.outreach.run",
    outcome: sent > 0 ? "achieved" : (blocked > 0 ? "blocked" : "partial"),
    block_reason: blocked > 0 ? BlockReason.MISSING_SECRET : null,
    failure_code: failed > 0 ? FailureCode.TWILIO_PROVIDER_ERROR : null,
    payload: { sent, blocked, failed, founder },
  });

  return new Response(JSON.stringify({ ok: true, sent, blocked, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
