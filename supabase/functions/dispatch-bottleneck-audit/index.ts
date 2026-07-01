// dispatch-bottleneck-audit — read-only forensic on why prospects are not being reached.
// Returns per-lead blocked_reason, choke-point ladder, Twilio + Resend last-20, health verdicts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Reason =
  | "missing_phone_and_email"
  | "missing_phone"
  | "missing_email"
  | "invalid_phone"
  | "lookup_failed"
  | "pending_validation"
  | "waiting_approval"
  | "dispatch_skipped"
  | "queue_error"
  | "delivery_error"
  | "delivered_no_response"
  | "none";

function classify(lead: any, smsByLead: Set<string>, emailByLead: Set<string>, failedByLead: Set<string>, deliveredByLead: Set<string>): Reason {
  const phone = lead.phone || lead.mobile_phone;
  const email = lead.email;
  const phoneType = (lead.phone_type ?? "").toLowerCase();
  const lookupErr = lead.metadata_json?.last_lookup_error;
  const dispatchErr = lead.metadata_json?.last_dispatch_error;

  if (!phone && !email) return "missing_phone_and_email";
  if (!phone && email) return "missing_phone";
  if (phone && !email && ["landline", "voip", "toll_free", "invalid"].includes(phoneType)) return "invalid_phone";
  if (!email && phone) return "missing_email";
  if (phone && ["landline", "voip", "toll_free", "invalid"].includes(phoneType)) return "invalid_phone";
  if (phone && !phoneType && lookupErr) return "lookup_failed";
  if (phone && !phoneType) return "pending_validation";
  if (lead.lead_status === "ready_for_contact" && lead.outreach_status === "none") return "waiting_approval";
  if (lead.outreach_status === "contacted" && !smsByLead.has(lead.id) && !emailByLead.has(lead.id)) return "dispatch_skipped";
  if (dispatchErr) return "queue_error";
  if (failedByLead.has(lead.id)) return "delivery_error";
  if (deliveredByLead.has(lead.id)) return "delivered_no_response";
  return "none";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- A. Load leads (cap 2000) + event lookup sets
    const { data: leads = [], error: leadsErr } = await sb
      .from("contractor_leads")
      .select("id, company_name, phone, mobile_phone, email, lead_status, outreach_status, enrichment_status, updated_at, created_at, metadata_json, phone_type:metadata_json")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (leadsErr) throw leadsErr;

    // phone_type is stored in metadata_json for most rows; also try dedicated column when present
    const enrichPhoneType = (l: any) => {
      const meta = l.metadata_json ?? {};
      l.phone_type = meta.phone_type ?? meta.twilio_line_type ?? null;
      return l;
    };
    (leads as any[]).forEach(enrichPhoneType);

    const { data: smsRows = [] } = await sb
      .from("outreach_sms_events")
      .select("prospect_id, contractor_id, status, recipient, error_code, last_error, created_at, sent_at, delivered_at, failed_at, metadata")
      .order("created_at", { ascending: false })
      .limit(500);
    const { data: emailRows = [] } = await sb
      .from("outreach_email_events")
      .select("prospect_id, contractor_id, recipient, sent_at, delivered_at, bounced_at, last_error, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    const smsByLead = new Set<string>();
    const emailByLead = new Set<string>();
    const failedByLead = new Set<string>();
    const deliveredByLead = new Set<string>();
    for (const r of smsRows as any[]) {
      const id = r.prospect_id ?? r.contractor_id;
      if (id) smsByLead.add(id);
      if (id && (r.failed_at || r.status === "failed" || r.status === "undelivered")) failedByLead.add(id);
      if (id && (r.delivered_at || r.status === "delivered")) deliveredByLead.add(id);
    }
    for (const r of emailRows as any[]) {
      const id = r.prospect_id ?? r.contractor_id;
      if (id) emailByLead.add(id);
      if (id && r.bounced_at) failedByLead.add(id);
      if (id && r.delivered_at) deliveredByLead.add(id);
    }

    // --- B. Per-lead classification + group counts
    const groupCounts: Record<string, number> = {};
    const perLead = (leads as any[]).map((l) => {
      const reason = classify(l, smsByLead, emailByLead, failedByLead, deliveredByLead);
      groupCounts[reason] = (groupCounts[reason] ?? 0) + 1;
      return {
        id: l.id,
        company_name: l.company_name,
        phone: l.phone || l.mobile_phone || null,
        email: l.email,
        current_status: l.lead_status,
        outreach_status: l.outreach_status,
        enrichment_status: l.enrichment_status,
        validation_status: l.phone_type ?? null,
        last_transition: l.updated_at,
        blocked_reason: reason,
        created_at: l.created_at,
      };
    });

    // --- C. Choke-point ladder
    const total = leads.length;
    const validated = (leads as any[]).filter((l) => (l.phone || l.mobile_phone || l.email)).length;
    const smsEligible = (leads as any[]).filter((l) => {
      const p = l.phone || l.mobile_phone;
      const t = (l.phone_type ?? "").toLowerCase();
      return p && (t === "mobile" || t === "" || t === null);
    }).length;
    const emailEligible = (leads as any[]).filter((l) => !!l.email).length;
    const queued = groupCounts["waiting_approval"] ?? 0;
    const dispatched = new Set([...smsByLead, ...emailByLead]).size;
    const delivered = deliveredByLead.size;

    const ladder = [
      { key: "imported", label: "Prospects imported", count: total },
      { key: "validated", label: "Has any contact point", count: validated },
      { key: "sms_eligible", label: "Eligible for SMS", count: smsEligible },
      { key: "email_eligible", label: "Eligible for email", count: emailEligible },
      { key: "queued", label: "Queued (ready_for_contact)", count: queued },
      { key: "dispatched", label: "Dispatched (event exists)", count: dispatched },
      { key: "delivered", label: "Delivered", count: delivered },
    ];
    let collapseAt: string | null = null;
    for (let i = 1; i < ladder.length; i++) {
      const prev = ladder[i - 1].count;
      const cur = ladder[i].count;
      if (prev > 0 && cur / prev < 0.3) { collapseAt = ladder[i].key; break; }
    }

    // --- D. Twilio last 20
    const twilioRecent = (smsRows as any[]).slice(0, 20).map((r) => ({
      recipient: r.recipient,
      status: r.status,
      error_code: r.error_code,
      carrier: r.metadata?.carrier ?? null,
      delivery_status: r.delivered_at ? "delivered" : r.failed_at ? "failed" : (r.sent_at ? "sent" : "queued"),
      last_error: r.last_error,
      created_at: r.created_at,
    }));
    const twilioHealth = {
      twilio_creds_present: !!Deno.env.get("TWILIO_AUTH_TOKEN") && !!Deno.env.get("TWILIO_ACCOUNT_SID"),
      queue_healthy: (smsRows as any[]).some((r) => new Date(r.created_at).getTime() > Date.now() - 86400_000),
      delivery_rate_24h: (() => {
        const day = (smsRows as any[]).filter((r) => new Date(r.created_at).getTime() > Date.now() - 86400_000);
        if (day.length === 0) return null;
        const d = day.filter((r) => r.delivered_at || r.status === "delivered").length;
        return +(d / day.length).toFixed(2);
      })(),
    };

    // --- E. Resend last 20
    const emailRecent = (emailRows as any[]).slice(0, 20).map((r) => ({
      recipient: r.recipient,
      status: r.delivered_at ? "delivered" : r.bounced_at ? "bounced" : (r.sent_at ? "sent" : "queued"),
      rejection_reason: r.last_error,
      bounce_reason: r.bounced_at ? (r.metadata?.bounce_reason ?? "bounce") : null,
      delivery_status: r.delivered_at ? "delivered" : r.bounced_at ? "bounced" : "pending",
      created_at: r.created_at,
    }));
    const { data: healthState } = await sb.from("outreach_health_state").select("*").eq("id", 1).maybeSingle();
    const emailHealth = {
      resend_key_present: !!Deno.env.get("RESEND_API_KEY"),
      verified_domain: healthState?.resend_verified_domain ?? null,
      last_send_status: healthState?.resend_last_send_status ?? null,
      last_send_error: healthState?.resend_last_send_error ?? null,
      accepted_by_resend_last500: (emailRows as any[]).filter((r) => !!r.metadata?.provider_message_id || !!r.sent_at).length,
      delivered_last500: (emailRows as any[]).filter((r) => r.delivered_at).length,
    };

    // --- F. Root cause + repair sequence
    const missing = (groupCounts.missing_phone_and_email ?? 0) + (groupCounts.missing_phone ?? 0) + (groupCounts.missing_email ?? 0);
    const dispatchSkipped = groupCounts.dispatch_skipped ?? 0;
    let rootCause = "unknown";
    let table = "n/a";
    if (missing >= total * 0.5) {
      rootCause = "Enrichment did not populate contact points on the majority of leads.";
      table = "contractor_leads.phone/email + acq-enrich-contractor";
    } else if (dispatchSkipped > 5) {
      rootCause = "Leads marked contacted but no provider event was written — dispatch worker short-circuited.";
      table = "outreach_sms_events / outreach_email_events + dispatch-outreach-batch";
    } else if ((groupCounts.pending_validation ?? 0) + (groupCounts.lookup_failed ?? 0) > total * 0.3) {
      rootCause = "Twilio Lookup did not resolve phone_type — validation stuck.";
      table = "acq-phone-backfill";
    }

    const recoverableNow =
      (groupCounts.pending_validation ?? 0) +
      (groupCounts.lookup_failed ?? 0) +
      (groupCounts.queue_error ?? 0) +
      (groupCounts.dispatch_skipped ?? 0) +
      (groupCounts.waiting_approval ?? 0);
    const needManual = groupCounts.missing_phone_and_email ?? 0;

    const repairSequence = [
      "renormalize_phones",
      "retry_stuck_validation",
      "reenrich_missing_contact",
      "requeue_orphaned",
      "clear_dead_queue_locks",
      "restart_stalled_workers",
    ];

    return new Response(
      JSON.stringify({
        generated_at: new Date().toISOString(),
        totals: {
          leads_loaded: total,
          sms_events_scanned: smsRows.length,
          email_events_scanned: emailRows.length,
        },
        group_counts: groupCounts,
        ladder,
        collapse_at: collapseAt,
        twilio: { recent: twilioRecent, health: twilioHealth },
        resend: { recent: emailRecent, health: emailHealth },
        final: {
          root_cause: rootCause,
          offending_table_or_function: table,
          prospects_recoverable_now: recoverableNow,
          prospects_needing_manual: needManual,
          repair_sequence: repairSequence,
        },
        per_lead: perLead,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[dispatch-bottleneck-audit]", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
