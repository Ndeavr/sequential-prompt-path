// Pure helpers (testable in Vitest). No Deno APIs here.
export type LeadForDraft = {
  id: string;
  phone_type?: string | null;
  do_not_contact?: boolean | null;
  unsubscribed_at?: string | null;
  sms_disabled?: boolean | null;
  sms_suppressed_at?: string | null;
};

export const CAMPAIGN = "agent_sms";
export const TEMPLATE = "v1_insight";
export const MAX_PER_RUN = 20;

export function cycleOf(d: Date): string {
  return d.toISOString().slice(0, 7); // one draft per lead per month
}

export function idempotencyKey(leadId: string, d: Date): string {
  return `${leadId}:${CAMPAIGN}:${TEMPLATE}:${cycleOf(d)}`;
}

/** Fail-closed: only verified mobile lines, never opt-out / DNC / suppressed. */
export function isDraftEligible(l: LeadForDraft): boolean {
  if (l.do_not_contact) return false;
  if (l.unsubscribed_at) return false;
  if (l.sms_disabled) return false;
  if (l.sms_suppressed_at) return false;
  return (l.phone_type ?? "").toLowerCase() === "mobile";
}
