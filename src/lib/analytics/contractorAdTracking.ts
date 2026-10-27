/**
 * Contractor campaign attribution across the public analysis entry.
 *
 * Preserve only known marketing/referral fields; never propagate credential,
 * phone, email, provider click id, or Stripe tokens in this helper.
 * Paid conversion remains server-authoritative via signed Stripe webhook.
 */
export const CONTRACTOR_MARKETING_FIELDS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "ref", "aff",
] as const;

export function trackedContractorAnalysisPath(runId: string, search: string): string {
  const result = new URLSearchParams({ run: runId });
  const incoming = new URLSearchParams(search);
  for (const key of CONTRACTOR_MARKETING_FIELDS) {
    const value = incoming.get(key)?.trim();
    if (value && value.length <= 120 && !/[\u0000-\u001f]/.test(value)) {
      result.set(key, value);
    }
  }
  return `/contractor/analysis?${result.toString()}`;
}

/** Canonical logger already uses this same session key for unique visitor views. */
export function contractorLandingDedupeKey(sessionId: string) {
  return `contractor-landing:${sessionId}`;
}
