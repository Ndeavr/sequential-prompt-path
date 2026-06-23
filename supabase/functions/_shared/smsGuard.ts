// PROTECTED — SMS pre-flight guard. Blocks test numbers, opt-outs, invalid phones.
// Every outbound SMS MUST pass through validateBeforeSend() before hitting Twilio.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { normalizePhone } from "./normalizePhone.ts";

// Known placeholder / test patterns that must never reach Twilio.
const BLOCKED_PATTERNS: RegExp[] = [
  /^\+15141234567$/,           // canonical "5141234567" test number
  /^\+11234567890$/,           // sequential dummy
  /^\+1555\d{7}$/,             // NANP reserved 555
  /^\+1000\d{7}$/,             // 000 area code
  /^\+1(\d)\1{9}$/,            // 10 of the same digit
  /^\+10{10}$/,                // all zeros
];

export type GuardOutcome =
  | { ok: true; normalized: string; area_code: string | null; country_code: string | null }
  | { ok: false; reason: "invalid_phone" | "blocked" | "opted_out" | "not_mobile" | "sms_disabled" | "max_failures"; detail: string; normalized: string | null };

export async function validateBeforeSend(opts: {
  supabase: ReturnType<typeof createClient>;
  phone: string | null | undefined;
  lead_id?: string | null;
}): Promise<GuardOutcome> {
  const norm = normalizePhone(opts.phone);
  if (!norm.valid || !norm.normalized) {
    return { ok: false, reason: "invalid_phone", detail: norm.reason ?? "invalid", normalized: norm.normalized };
  }
  for (const re of BLOCKED_PATTERNS) {
    if (re.test(norm.normalized)) {
      return { ok: false, reason: "blocked", detail: `matches ${re.source}`, normalized: norm.normalized };
    }
  }
  // Opt-out check
  const { data: opt } = await opts.supabase
    .from("sms_opt_outs")
    .select("normalized_phone")
    .eq("normalized_phone", norm.normalized)
    .maybeSingle();
  if (opt) {
    return { ok: false, reason: "opted_out", detail: "in sms_opt_outs", normalized: norm.normalized };
  }

  // Mobile-only + failure-threshold guard. Looks up the lead row (when id provided)
  // and rejects landlines, VoIP, unknown, sms_disabled, or >=2 failed attempts.
  let resolvedPhoneType: string | null = null;
  if (opts.lead_id) {
    const { data: lead } = await opts.supabase
      .from("contractor_leads")
      .select("phone_type, sms_disabled, sms_failed_attempts")
      .eq("id", opts.lead_id)
      .maybeSingle();
    if (lead) {
      const failed = (lead as any).sms_failed_attempts ?? 0;
      if ((lead as any).sms_disabled === true) {
        return { ok: false, reason: "sms_disabled", detail: "lead.sms_disabled=true", normalized: norm.normalized };
      }
      if (failed >= 2) {
        await opts.supabase.from("contractor_leads").update({
          sms_disabled: true,
          contact_method: "email",
          sms_suppressed_at: new Date().toISOString(),
          sms_suppressed_reason: failed >= 5 ? "permanent_suppression" : "failure_threshold",
        }).eq("id", opts.lead_id);
        return { ok: false, reason: "max_failures", detail: `sms_failed_attempts=${failed}`, normalized: norm.normalized };
      }
      resolvedPhoneType = (lead as any).phone_type ?? null;
    }
  }

  // If phone_type unknown/missing, attempt inline Twilio Lookup (cached 90d).
  if (!resolvedPhoneType || resolvedPhoneType === "unknown") {
    const looked = await lookupPhoneTypeCached(opts.supabase, norm.normalized);
    if (looked) {
      resolvedPhoneType = looked;
      if (opts.lead_id) {
        await opts.supabase.from("contractor_leads").update({
          phone_type: looked,
          phone_e164: norm.normalized,
          phone_validation_status: looked === "mobile" ? "verified_mobile" : "verified_not_mobile",
          phone_validation_checked_at: new Date().toISOString(),
          phone_lookup_at: new Date().toISOString(),
          ...(looked !== "mobile" ? {
            sms_disabled: true,
            sms_suppressed_at: new Date().toISOString(),
            sms_suppressed_reason: `twilio_lookup_${looked}`,
            contact_method: "email",
          } : {}),
        }).eq("id", opts.lead_id);
      }
    }
  }

  if (resolvedPhoneType && resolvedPhoneType !== "mobile") {
    return { ok: false, reason: "not_mobile", detail: `phone_type=${resolvedPhoneType}`, normalized: norm.normalized };
  }

  return { ok: true, normalized: norm.normalized, area_code: norm.area_code, country_code: norm.country_code };
}

export function isBlockedSync(normalizedPhone: string): boolean {
  return BLOCKED_PATTERNS.some((re) => re.test(normalizedPhone));
}
