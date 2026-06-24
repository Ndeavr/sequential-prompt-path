// PROTECTED — Unified outreach dispatcher.
// Rule: SMS only to mobile. Landline/voip/unknown → email fallback (if email valid) → else manual queue.
// Writes acquisition_events for every decision so the funnel reflects real outcomes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validateBeforeSend, lookupPhoneTypeCached } from "./smsGuard.ts";
import { sendSms } from "./twilioSend.ts";
import { normalizePhone } from "./normalizePhone.ts";
import { wrapAllUrls, validateCta, withReplyFooter } from "./ctaTracker.ts";
import { recordEmailEvent, recordSmsEvent } from "./outreachEvents.ts";
import { checkAutopilotGate } from "./autopilotGate.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

export type DispatchInput = {
  lead_id?: string;
  contractor_id?: string;
  phone?: string | null;
  email?: string | null;
  sms_body: string;
  email_subject?: string;
  email_html?: string;
  template_key?: string;
  message_type?: string;
  campaign_id?: string;
  metadata?: Record<string, unknown>;
};

export type DispatchResult = {
  ok: boolean;
  channel: "sms" | "email" | "none";
  outcome:
    | "sms_sent"
    | "sms_blocked_landline"
    | "email_sent_fallback"
    | "email_sent_primary"
    | "needs_manual_contact"
    | "sms_provider_error"
    | "email_provider_error"
    | "no_contact";
  detail?: string;
  twilio_sid?: string | null;
  resend_id?: string | null;
};

function isValidEmail(v?: string | null): boolean {
  return !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

async function logEvent(
  supabase: ReturnType<typeof createClient>,
  args: {
    event_type: "sent" | "failed" | "delivered";
    channel: "sms" | "email";
    lead_id?: string;
    contractor_id?: string;
    provider?: string;
    provider_event_id?: string;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    await supabase.from("acquisition_events").insert({
      event_type: args.event_type,
      channel: args.channel,
      lead_id: args.lead_id ?? null,
      contractor_id: args.contractor_id ?? null,
      provider: args.provider ?? null,
      provider_event_id: args.provider_event_id ?? null,
      metadata: args.metadata ?? {},
      occurred_at: new Date().toISOString(),
    });
  } catch (_) { /* swallow */ }
}

async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string,
  ctx: { lead_id?: string; contractor_id?: string; campaign?: string; template_key?: string } = {},
): Promise<{ ok: boolean; id?: string; error?: string; cta_urls?: string[]; has_tracked_cta?: boolean; rendered_html?: string }> {
  if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
    return { ok: false, error: "resend_not_configured" };
  }
  // Append the FR reply-as-conversion footer (OUI) on every outreach email
  const withFooter = withReplyFooter(html);
  // Wrap every internal URL through /r/ tracker
  const wrapped = await wrapAllUrls(withFooter, {
    prospect_id: ctx.lead_id ?? null,
    contractor_id: ctx.contractor_id ?? null,
    campaign: ctx.campaign ?? ctx.template_key ?? null,
    channel: "email",
  });
  const v = validateCta(wrapped.body);
  if (!v.ok) {
    return { ok: false, error: v.reason ?? "missing_cta", cta_urls: v.cta_urls, has_tracked_cta: v.has_tracked_cta, rendered_html: wrapped.body };
  }
  try {
    const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "UNPRO <onboarding@resend.dev>",
        to: [to],
        subject,
        html: wrapped.body,
        tags: [
          { name: "campaign", value: String(ctx.campaign ?? ctx.template_key ?? "outreach") },
          ...(ctx.contractor_id ? [{ name: "contractor_id", value: ctx.contractor_id }] : []),
          ...(ctx.lead_id ? [{ name: "lead_id", value: ctx.lead_id }] : []),
        ],
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: data?.message ?? `HTTP ${resp.status}`, cta_urls: wrapped.cta_urls, has_tracked_cta: wrapped.has_tracked_cta, rendered_html: wrapped.body };
    // Record canonical sent event so the funnel sees this email immediately
    if (data?.id) {
      await recordEmailEvent(data.id as string, "sent", {
        recipient: to,
        contractor_id: ctx.contractor_id ?? undefined,
        campaign_id: ctx.campaign ?? ctx.template_key ?? undefined,
        template: ctx.template_key ?? undefined,
        subject,
      });
    }
    return { ok: true, id: data?.id, cta_urls: wrapped.cta_urls, has_tracked_cta: wrapped.has_tracked_cta, rendered_html: wrapped.body };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), cta_urls: wrapped.cta_urls, has_tracked_cta: wrapped.has_tracked_cta, rendered_html: wrapped.body };
  }
}

export async function sendOutreach(input: DispatchInput): Promise<DispatchResult> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Hard autopilot gate — block every dispatch unless e2e selftest passed within 24h.
  // Bypass with metadata.bypass_gate === true (used by the selftest itself and admin tools).
  if (!input.metadata || (input.metadata as any).bypass_gate !== true) {
    const gate = await checkAutopilotGate(supabase);
    if (!gate.allowed) {
      return { ok: false, channel: "none", outcome: "needs_manual_contact", detail: `autopilot_gated:${gate.reason}` };
    }
  }

  const phoneNorm = normalizePhone(input.phone);
  const hasValidPhone = phoneNorm.valid && phoneNorm.normalized;
  const hasValidEmail = isValidEmail(input.email);

  // Try SMS first if phone present
  if (hasValidPhone) {
    const guard = await validateBeforeSend({ supabase, phone: phoneNorm.normalized!, lead_id: input.lead_id });

    if (guard.ok) {
      const res = await sendSms({
        to: phoneNorm.normalized!,
        body: input.sms_body,
        message_type: (input.message_type as any) ?? "outreach",
        template_key: input.template_key,
        lead_id: input.lead_id,
        contractor_id: input.contractor_id,
        campaign_id: input.campaign_id,
        metadata: { ...(input.metadata ?? {}), channel: "sms" },
      });
      const sent = ["sending", "queued"].includes(res.status);
      await logEvent(supabase, {
        event_type: sent ? "sent" : "failed",
        channel: "sms",
        lead_id: input.lead_id,
        contractor_id: input.contractor_id,
        provider: "twilio",
        provider_event_id: res.twilio_sid ?? undefined,
        metadata: {
          channel: "sms",
          status: res.status,
          template_key: input.template_key,
          ...(sent ? {} : { failure_class: "provider_error", error_code: res.error_code, error_message: res.error_message }),
        },
      });
      return {
        ok: sent,
        channel: "sms",
        outcome: sent ? "sms_sent" : "sms_provider_error",
        detail: res.error_message,
        twilio_sid: res.twilio_sid,
      };
    }

    // Guard blocked → try email fallback if available
    if (guard.reason === "not_mobile" || guard.reason === "invalid_phone" || guard.reason === "max_failures" || guard.reason === "sms_disabled") {
      if (hasValidEmail && input.email_subject && input.email_html) {
        const r = await sendEmailViaResend(input.email!, input.email_subject, input.email_html, {
          lead_id: input.lead_id, contractor_id: input.contractor_id, template_key: input.template_key, campaign: input.campaign_id,
        });
        await logEvent(supabase, {
          event_type: r.ok ? "sent" : "failed",
          channel: "email",
          lead_id: input.lead_id,
          contractor_id: input.contractor_id,
          provider: "resend",
          provider_event_id: r.id,
          metadata: {
            channel: "email",
            template_key: input.template_key,
            fallback_from: "sms",
            sms_block_reason: guard.reason,
            cta_urls: r.cta_urls ?? [],
            has_tracked_cta: !!r.has_tracked_cta,
            ...(r.ok ? {} : { failure_class: r.error === "missing_cta" ? "missing_cta" : "provider_error", error_message: r.error }),
          },
        });
        return {
          ok: r.ok,
          channel: "email",
          outcome: r.ok ? "email_sent_fallback" : "email_provider_error",
          detail: r.error,
          resend_id: r.id,
        };
      }

      // No email → manual queue
      await logEvent(supabase, {
        event_type: "failed",
        channel: "sms",
        lead_id: input.lead_id,
        contractor_id: input.contractor_id,
        metadata: {
          reason: "needs_manual_contact",
          sms_block_reason: guard.reason,
          channel_decision_reason: guard.reason === "not_mobile" ? "landline_sms_blocked" : guard.reason,
        },
      });
      try {
        await supabase.functions.invoke("contact-verification-enqueue", {
          body: {
            source_lead_id: input.lead_id,
            source_table: "contractor_leads",
            phone: phoneNorm.normalized,
            email: input.email,
            reason: `sms_blocked_${guard.reason}`,
          },
        });
      } catch (_) { /* swallow */ }
      return { ok: false, channel: "none", outcome: "needs_manual_contact", detail: guard.reason };
    }

    // Hard block (opted_out, etc.) — do not fallback
    await logEvent(supabase, {
      event_type: "failed",
      channel: "sms",
      lead_id: input.lead_id,
      contractor_id: input.contractor_id,
      metadata: { sms_block_reason: guard.reason, failure_class: "policy_block" },
    });
    return { ok: false, channel: "none", outcome: "needs_manual_contact", detail: guard.reason };
  }

  // No phone — try email primary
  if (hasValidEmail && input.email_subject && input.email_html) {
    const r = await sendEmailViaResend(input.email!, input.email_subject, input.email_html, {
      lead_id: input.lead_id, contractor_id: input.contractor_id, template_key: input.template_key, campaign: input.campaign_id,
    });
    await logEvent(supabase, {
      event_type: r.ok ? "sent" : "failed",
      channel: "email",
      lead_id: input.lead_id,
      contractor_id: input.contractor_id,
      provider: "resend",
      provider_event_id: r.id,
      metadata: {
        channel: "email",
        template_key: input.template_key,
        cta_urls: r.cta_urls ?? [],
        has_tracked_cta: !!r.has_tracked_cta,
        ...(r.ok ? {} : { failure_class: r.error === "missing_cta" ? "missing_cta" : "provider_error", error_message: r.error }),
      },
    });
    return {
      ok: r.ok,
      channel: "email",
      outcome: r.ok ? "email_sent_primary" : "email_provider_error",
      detail: r.error,
      resend_id: r.id,
    };
  }

  await logEvent(supabase, {
    event_type: "failed",
    channel: "sms",
    lead_id: input.lead_id,
    contractor_id: input.contractor_id,
    metadata: { reason: "no_contact" },
  });
  return { ok: false, channel: "none", outcome: "no_contact", detail: "no valid phone or email" };
}
