// Single eligibility contract every outreach worker must call before sending
// SMS, email, or spending AI credits on personalization.
//
// Callers can use assertCanX (throws SkipError) for guard-clause style, or
// canX for boolean checks in orchestrators.

export type SkipReason =
  | "not_eligible"
  | "not_mobile"
  | "aggregator"
  | "unreachable"
  | "low_score"
  | "do_not_contact"
  | "missing_phone"
  | "missing_email";

export class SkipError extends Error {
  reason: SkipReason;
  constructor(reason: SkipReason, message?: string) {
    super(message ?? reason);
    this.reason = reason;
    this.name = "SkipError";
  }
}

export interface EligibilityInput {
  outreach_eligible?: boolean | null;
  phone_type?: string | null;
  aggregator_email?: boolean | null;
  do_not_contact?: boolean | null;
  acquisition_priority_score?: number | null;
  phone?: string | null;
  email?: string | null;
}

export function canSendSMS(p: EligibilityInput): SkipReason | null {
  if (p.do_not_contact) return "do_not_contact";
  if (!p.outreach_eligible) return "not_eligible";
  if (!p.phone) return "missing_phone";
  if (p.phone_type !== "mobile") return "not_mobile";
  return null;
}

export function canSendEmail(p: EligibilityInput): SkipReason | null {
  if (p.do_not_contact) return "do_not_contact";
  if (!p.outreach_eligible) return "not_eligible";
  if (!p.email) return "missing_email";
  if (p.aggregator_email) return "aggregator";
  return null;
}

export function canPersonalize(p: EligibilityInput, minScore = 50): SkipReason | null {
  if ((p.acquisition_priority_score ?? 0) < minScore) return "low_score";
  return null;
}

export function assertCanSendSMS(p: EligibilityInput) {
  const r = canSendSMS(p);
  if (r) throw new SkipError(r);
}
export function assertCanSendEmail(p: EligibilityInput) {
  const r = canSendEmail(p);
  if (r) throw new SkipError(r);
}
export function assertCanPersonalize(p: EligibilityInput, minScore = 50) {
  const r = canPersonalize(p, minScore);
  if (r) throw new SkipError(r);
}
