// UNPRO — Centralized outreach channel selector.
// Rule: never queue SMS to anything but a verified mobile, and never to a lead
// whose SMS attempts have been disabled. Falls back to email automatically.

export type ContactMethod = "mobile_sms" | "email" | "manual" | "skip" | "unknown";

export interface ContactLead {
  phone_type?: string | null;
  phone_validation_status?: string | null;
  email?: string | null;
  sms_disabled?: boolean | null;
  sms_failed_attempts?: number | null;
  do_not_contact?: boolean | null;
  email_fallback_enabled?: boolean | null;
}

export interface ContactDecision {
  method: ContactMethod;
  channels: Array<"sms" | "email">;
  reason: string;
}

export function selectContactMethod(lead: ContactLead): ContactDecision {
  const email = (lead.email ?? "").trim();
  const hasEmail = email.length > 0 && /@/.test(email);
  const isMobile = lead.phone_type === "mobile";
  const smsDisabled =
    lead.sms_disabled === true || (lead.sms_failed_attempts ?? 0) >= 2;

  if (lead.do_not_contact) {
    return { method: "skip", channels: [], reason: "do_not_contact" };
  }

  // Priority 1: mobile + email → SMS + scheduled email follow-up
  if (isMobile && !smsDisabled && hasEmail) {
    return { method: "mobile_sms", channels: ["sms", "email"], reason: "mobile_with_email_followup" };
  }
  // Mobile-only (no email)
  if (isMobile && !smsDisabled) {
    return { method: "mobile_sms", channels: ["sms"], reason: "mobile_no_email" };
  }
  // Priority 2: email only (landline/voip/unknown/sms_disabled but email exists)
  if (hasEmail && lead.email_fallback_enabled !== false) {
    return { method: "email", channels: ["email"], reason: smsDisabled ? "sms_disabled_email_fallback" : "non_mobile_email_fallback" };
  }
  // Priority 3: has phone but not mobile, no email → manual review
  if (!hasEmail && (lead.phone_type === "landline" || lead.phone_type === "voip" || lead.phone_type === "unknown")) {
    return { method: "manual", channels: [], reason: "non_mobile_no_email" };
  }
  // Priority 4: nothing actionable
  return { method: "skip", channels: [], reason: "no_actionable_channel" };
}

export function deriveContactMethodFromValidation(opts: {
  phone_type?: string | null;
  phone_validation_status?: string | null;
  email?: string | null;
  do_not_contact?: boolean | null;
}): ContactMethod {
  if (opts.do_not_contact) return "skip";
  const status = opts.phone_validation_status ?? "";
  const email = (opts.email ?? "").trim();
  const hasEmail = email.length > 0 && /@/.test(email);

  if (status === "invalid_phone" || status === "outside_quebec") {
    return hasEmail ? "email" : "skip";
  }
  if (opts.phone_type === "mobile") return "mobile_sms";
  if (hasEmail) return "email";
  if (opts.phone_type === "landline" || opts.phone_type === "voip" || opts.phone_type === "unknown") {
    return "manual";
  }
  return "unknown";
}
