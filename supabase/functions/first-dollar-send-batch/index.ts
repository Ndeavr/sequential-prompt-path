/**
 * first-dollar-send-batch — Controlled SMS batch sender for the $1 sprint.
 *
 * Selects N SCORED leads, assigns templates A/B/C round-robin, sends via
 * canonical Twilio path, records batch in sms_batches, transitions leads
 * to MESSAGED. Requires previous batch to be reviewed (status='reviewed')
 * unless force=true.
 */
import { assertSmsHealthy } from "../_shared/smsHealth.ts";
import {
  corsHeaders,
  adminClient,
  transitionLead,
  logLaunchEvent,
  isFounderModeActive,
} from "../_shared/launch.ts";
import { FailureCode } from "../_shared/reliability.ts";
import { sendSms as sendSmsCanonical } from "../_shared/twilioSend.ts";

const LANDING_BASE =
  Deno.env.get("FIRST_DOLLAR_LANDING_BASE") ??
  "https://www.unpro.ca/analyse";

function firstName(name?: string | null): string {
  if (!name) return "Bonjour";
  return name.split(/\s+/)[0];
}

function renderTemplate(body: string, lead: any): string {
  const fn = firstName(lead.company_name ?? lead.contact_name);
  const slug = lead.slug ?? lead.id;
  const link = `${LANDING_BASE}/${slug}`;
  return body
    .replaceAll("[FIRSTNAME]", fn)
    .replaceAll("[LINK]", link)
    .replaceAll("[COMPANY]", lead.company_name ?? "votre entreprise")
    .replaceAll("[CITY]", lead.city ?? "votre région");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const health = await assertSmsHealthy();
  if (!health.ok) {
    return new Response(
      JSON.stringify({ ok: false, blocked: true, reason: health.reason }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const body = await req.json().catch(() => ({} as any));
  // Hard cap: never exceed 25 recipients per approved batch, regardless of input.
  const requestedSize = Math.max(1, Number(body.size ?? 25));
  const size = Math.min(requestedSize, 25);
  const force = Boolean(body.force);
  const sb = adminClient();

  // Enforce review-gate: block if a pending/sent batch exists without review
  if (!force) {
    const { data: pending } = await sb
      .from("sms_batches")
      .select("id,status,created_at")
      .in("status", ["pending", "sending", "sent"])
      .is("reviewed_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (pending && pending.length > 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          blocked: true,
          reason: "PREVIOUS_BATCH_NOT_REVIEWED",
          pending_batch_id: pending[0].id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  // Load active templates
  const { data: templates } = await sb
    .from("sms_templates_first_dollar")
    .select("code,body")
    .eq("active", true)
    .order("code");
  if (!templates || templates.length === 0) {
    return new Response(
      JSON.stringify({ ok: false, error: "NO_ACTIVE_TEMPLATES" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Select candidate leads — filter out already-claimed (sms_batch_id IS NULL)
  const { data: leads } = await sb
    .from("launch_leads")
    .select("*")
    .in("lead_status", ["SCORED", "ENRICHED"])
    .not("phone", "is", null)
    .is("sms_batch_id", null)
    .order("last_event_at", { ascending: true })
    .limit(size);

  if (!leads || leads.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, sent: 0, message: "No eligible leads" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Create batch record
  const leadIds = leads.map((l: any) => l.id);
  const distribution: Record<string, number> = {};
  const now = new Date().toISOString();
  const { data: batch, error: batchErr } = await sb
    .from("sms_batches")
    .insert({
      size: leads.length,
      requested_count: requestedSize,
      selected_count: leads.length,
      lead_ids: leadIds,
      status: "sending",
      started_at: now,
      template_distribution: distribution,
    })
    .select("id")
    .single();
  if (batchErr || !batch) {
    return new Response(
      JSON.stringify({ ok: false, error: batchErr?.message ?? "batch_insert_failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Atomic claim: only take leads still un-claimed. Prevents duplicate sends
  // if two clicks fire simultaneously.
  const { data: claimed } = await sb
    .from("launch_leads")
    .update({ sms_batch_id: batch.id })
    .in("id", leadIds)
    .is("sms_batch_id", null)
    .select("id");
  const claimedIds = new Set(((claimed ?? []) as any[]).map(r => r.id));
  const claimedLeads = leads.filter((l: any) => claimedIds.has(l.id));
  if (claimedLeads.length === 0) {
    await sb.from("sms_batches").update({
      status: "sent",
      completed_at: new Date().toISOString(),
      blocked_reason: "ALL_LEADS_CLAIMED_BY_OTHER_BATCH",
    }).eq("id", batch.id);
    return new Response(
      JSON.stringify({ ok: false, blocked: true, reason: "ALL_LEADS_CLAIMED_BY_OTHER_BATCH" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const founder = await isFounderModeActive();
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead: any = leads[i];
    const tmpl = templates[i % templates.length];
    distribution[tmpl.code] = (distribution[tmpl.code] ?? 0) + 1;

    // Tag lead with template + batch
    await sb
      .from("launch_leads")
      .update({ template_code: tmpl.code, sms_batch_id: batch.id })
      .eq("id", lead.id);

    try {
      await transitionLead(lead.id, "MESSAGING", {}, "first-dollar-send-batch");
      const rendered = renderTemplate(tmpl.body, lead);
      const r = await sendSmsCanonical({
        to: lead.phone,
        body: rendered,
        message_type: "outreach",
        template_key: `first_dollar_${tmpl.code}`,
        lead_id: lead.id,
      });
      const ok = r.status === "sending" || r.status === "queued";
      if (ok) {
        await transitionLead(lead.id, "MESSAGED", {
          payload: {
            ...(lead.payload ?? {}),
            first_dollar: {
              batch_id: batch.id,
              template_code: tmpl.code,
              sent_at: new Date().toISOString(),
              founder_mode: founder,
            },
          },
        }, "first-dollar-send-batch");
        sent++;
      } else {
        failed++;
        await sb.from("launch_leads").update({
          lead_status: "FAILED",
          failure_code: FailureCode.TWILIO_PROVIDER_ERROR,
        }).eq("id", lead.id);
        await logLaunchEvent({
          lead_id: lead.id,
          agent: "first-dollar-send-batch",
          event: "sms_failed",
          success: false,
          message: r.error_message ?? r.status,
        });
      }
    } catch (e) {
      failed++;
      await logLaunchEvent({
        lead_id: lead.id,
        agent: "first-dollar-send-batch",
        event: "send_exception",
        success: false,
        message: String(e),
      });
    }
  }

  await sb
    .from("sms_batches")
    .update({
      status: "sent",
      sent_count: sent,
      template_distribution: distribution,
    })
    .eq("id", batch.id);

  return new Response(
    JSON.stringify({
      ok: true,
      batch_id: batch.id,
      sent,
      failed,
      template_distribution: distribution,
      message: "Batch envoyé. Approuver la revue pour débloquer le prochain.",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
