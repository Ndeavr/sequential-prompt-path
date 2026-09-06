/**
 * UNPRO — Canonical contractor acquisition funnel (single source of truth).
 *
 * Every public contractor CTA lands on ONE no-payment activation path.
 * Legacy routes are preserved (no deletions) — only their primary CTA is
 * redirected here — and token / affiliate / UTM attribution is always carried
 * across the hop.
 */

/** Public, no-payment entry for an organic contractor. */
export const CONTRACTOR_ENTRY_PATH = "/join";
/** Authenticated activation gate (creates role + contractor row, no payment). */
export const CONTRACTOR_ACTIVATION_PATH = "/join/profile";

/** Params that must survive every hop of the funnel. */
export const ATTRIBUTION_PARAMS = [
  "token",
  "t",
  "aff",
  "affiliate",
  "ref",
  "prospect",
  "prospect_id",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "source",
] as const;

/** Extract the attribution params from a search string (defaults to the URL). */
export function readAttribution(search?: string): Record<string, string> {
  const raw = search ?? (typeof window !== "undefined" ? window.location.search : "");
  const out: Record<string, string> = {};
  try {
    const params = new URLSearchParams(raw);
    for (const key of ATTRIBUTION_PARAMS) {
      const value = params.get(key);
      if (value) out[key] = value;
    }
  } catch { /* noop */ }
  return out;
}

/**
 * Build the canonical contractor entry URL, preserving attribution.
 * `extra` wins over params already present in the URL.
 */
export function buildContractorEntryUrl(
  extra: Record<string, string | undefined> = {},
  basePath: string = CONTRACTOR_ENTRY_PATH,
): string {
  const merged: Record<string, string> = { ...readAttribution() };
  for (const [k, v] of Object.entries(extra)) {
    if (v) merged[k] = v;
  }
  const qs = new URLSearchParams(merged).toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Canonical activation URL for a solicited contractor holding a token. */
export function buildTokenActivationUrl(token: string): string {
  return buildContractorEntryUrl({}, `/join/${encodeURIComponent(token)}`);
}
