// Phase 3 — Queue creation + channel routing repair.
// Audits why contactable leads are not ready_for_contact, and computes a
// deterministic channel routing decision per lead.
//
// SAFETY (P0 rules):
//  - Dry-run by default (`execute` must be explicitly true).
//  - NEVER sends anything. It only reports / persists routing decisions.
//  - SMS is allowed ONLY for phone_type = 'mobile' with a valid E.164 number,
//    sms not disabled, no opt-out, no do_not_contact.
//  - Unknown / landline / VOIP / invalid phone => verified email if available,
//    otherwise manual review (compliance_review_required = true).
//  - An email is "verified" only when email_trust_state/email_status say so.
//    An unverified email NEVER becomes an automatic send channel.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Channel = "sms" | "email" | "manual_review" | "blocked";

const VERIFIED_EMAIL_TRUST = new Set(["verified", "valid", "deliverable", "trusted"]);
const VERIFIED_EMAIL_STATUS = new Set(["verified", "valid", "deliverable"]);

interface LeadRow {
  id: string;
  lead_status: string | null;
  phone: string | null;
  phone_e164: string | null;
  phone_type: string | null;
  email: string | null;
  email_status: string | null;
  email_trust_state: string | null;
  contact_method: string | null;
  do_not_contact: boolean | null;
  unsubscribed_at: string | null;
  sms_disabled: boolean | null;
  email_fallback_enabled: boolean | null;
  consent_to_contact: string | null;
  compliance_review_required: boolean | null;
}

function isVerifiedEmail(l: LeadRow): boolean {
  if (!l.email || !l.email.includes("@")) return false;
  const trust = (l.email_trust_state ?? "").toLowerCase();
  const status = (l.email_status ?? "").toLowerCase();
  return VERIFIED_EMAIL_TRUST.has(trust) || VERIFIED_EMAIL_STATUS.has(status);
}

function routeLead(l: LeadRow): { channel: Channel; reason: string } {
  if (l.do_not_contact) return { channel: "blocked", reason: "do_not_contact" };
  if (l.unsubscribed_at) return { channel: "blocked", reason: "unsubscribed" };
  if (String(l.consent_to_contact ?? "").toLowerCase() === "refused") {
    return { channel: "blocked", reason: "consent_refused" };
  }

  const phoneType = (l.phone_type ?? "unknown").toLowerCase();
  const smsCapable =
    phoneType === "mobile" &&
    !!l.phone_e164 &&
    /^\+\d{10,15}$/.test(l.phone_e164) &&
    l.sms_disabled !== true;

  if (smsCapable) return { channel: "sms", reason: "verified_mobile" };

  if (isVerifiedEmail(l) && l.email_fallback_enabled !== false) {
    return { channel: "email", reason: `email_fallback_${phoneType}` };
  }

  if (l.email && l.email.includes("@")) {
    return { channel: "manual_review", reason: "email_not_verified" };
  }
  if (l.phone || l.phone_e164) {
    return { channel: "manual_review", reason: `phone_${phoneType}_no_email` };
  }
  return { channel: "manual_review", reason: "no_channel" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const execute = body?.execute === true;

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await sb
      .from("contractor_leads")
      .select(
        "id, lead_status, phone, phone_e164, phone_type, email, email_status, email_trust_state, contact_method, do_not_contact, unsubscribed_at, sms_disabled, email_fallback_enabled, consent_to_contact, compliance_review_required",
      )
      .or("phone.not.is.null,phone_e164.not.is.null,email.not.is.null");

    if (error) throw error;
    const contactable = (data ?? []) as LeadRow[];

    const total_contactable = contactable.length;
    const before_ready = contactable.filter((l) => l.lead_status === "ready_for_contact").length;

    const routing: Record<Channel, number> = { sms: 0, email: 0, manual_review: 0, blocked: 0 };
    const reasons: Record<string, number> = {};
    const eligible: string[] = [];
    const toEmail: string[] = [];
    const toSms: string[] = [];
    const toReview: Array<{ id: string; reason: string }> = [];
    const blocked: Array<{ id: string; reason: string }> = [];

    for (const l of contactable) {
      const { channel, reason } = routeLead(l);
      routing[channel] += 1;
      reasons[`${channel}:${reason}`] = (reasons[`${channel}:${reason}`] ?? 0) + 1;

      if (channel === "blocked") { blocked.push({ id: l.id, reason }); continue; }
      if (channel === "manual_review") { toReview.push({ id: l.id, reason }); continue; }
      if (channel === "sms") toSms.push(l.id); else toEmail.push(l.id);

      if (l.lead_status === "ready_for_contact") continue;
      if (l.lead_status && !["new", "enriched"].includes(l.lead_status)) {
        blocked.push({ id: l.id, reason: `status_${l.lead_status}` });
        continue;
      }
      eligible.push(l.id);
    }

    let promoted = 0;
    let routed_sms = 0;
    let routed_email = 0;
    let flagged_review = 0;

    if (execute) {
      const chunk = <T,>(arr: T[], n = 200) =>
        Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

      for (const slice of chunk(eligible)) {
        const { error: e, count } = await sb
          .from("contractor_leads")
          .update({ lead_status: "ready_for_contact", updated_at: new Date().toISOString() }, { count: "exact" })
          .in("id", slice)
          .in("lead_status", ["new", "enriched"]);
        if (!e) promoted += count ?? slice.length;
      }
      for (const slice of chunk(toSms)) {
        const { error: e, count } = await sb
          .from("contractor_leads")
          .update({ contact_method: "sms", updated_at: new Date().toISOString() }, { count: "exact" })
          .in("id", slice);
        if (!e) routed_sms += count ?? slice.length;
      }
      for (const slice of chunk(toEmail)) {
        const { error: e, count } = await sb
          .from("contractor_leads")
          .update({ contact_method: "email", updated_at: new Date().toISOString() }, { count: "exact" })
          .in("id", slice);
        if (!e) routed_email += count ?? slice.length;
      }
      for (const slice of chunk(toReview.map((r) => r.id))) {
        const { error: e, count } = await sb
          .from("contractor_leads")
          .update({
            contact_method: "manual_review",
            compliance_review_required: true,
            compliance_review_reason: "channel_routing_unverified",
            compliance_review_flagged_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { count: "exact" })
          .in("id", slice);
        if (!e) flagged_review += count ?? slice.length;
      }
    }

    const { count: after_ready } = await sb
      .from("contractor_leads")
      .select("id", { count: "exact", head: true })
      .eq("lead_status", "ready_for_contact");

    return new Response(JSON.stringify({
      ok: true,
      dry_run: !execute,
      execute,
      total_contactable,
      before_ready,
      after_ready: after_ready ?? null,
      eligible: eligible.length,
      promoted,
      routing_plan: routing,
      routing_reasons: reasons,
      applied: { routed_sms, routed_email, flagged_review },
      review_samples: toReview.slice(0, 20),
      blocked_samples: blocked.slice(0, 20),
      note: "No message is ever sent by this function. SMS routing requires phone_type='mobile' + valid E.164. Unverified emails go to manual review.",
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
