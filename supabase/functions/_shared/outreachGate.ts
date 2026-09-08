// UNPRO — P0 fail-closed outreach gate.
//
// Single source of truth for "may this process contact a real prospect?".
// Every sender AND every paid verification (Twilio Lookup) path must call
// `assertOutreachEnabled()` BEFORE queue insertion, before any status mutation
// to sent/activation_sent, before checkout creation and before any provider
// invocation.
//
// Fail-closed contract: if the flag is missing, unreadable, or the query
// throws, sending stays BLOCKED. There is no permissive fallback.

export type OutreachGate = { allowed: boolean; reason: string };

export const OUTREACH_FLAG_KEY = "OUTREACH_ENABLED";

/** Pure decision on a raw flag value. Only a real boolean `true` opens the gate. */
export function evaluateOutreachFlag(value: unknown, readError?: unknown): OutreachGate {
  if (readError) return { allowed: false, reason: "OUTREACH_FLAG_UNREADABLE" };
  if (value === true) return { allowed: true, reason: "OUTREACH_ENABLED" };
  if (value === undefined || value === null) return { allowed: false, reason: "OUTREACH_FLAG_MISSING" };
  return { allowed: false, reason: "OUTREACH_DISABLED" };
}

type MinimalClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: { value?: unknown } | null; error?: unknown }>;
      };
    };
  };
};

/** Reads public.system_flags.OUTREACH_ENABLED, fail-closed on any error. */
export async function assertOutreachEnabled(sb: MinimalClient): Promise<OutreachGate> {
  try {
    const { data, error } = await sb
      .from("system_flags")
      .select("value")
      .eq("key", OUTREACH_FLAG_KEY)
      .maybeSingle();
    if (error) return evaluateOutreachFlag(undefined, error);
    return evaluateOutreachFlag(data?.value);
  } catch (e) {
    return evaluateOutreachFlag(undefined, e ?? new Error("gate_read_failed"));
  }
}

/**
 * NARROW exemption list — P0 audit requirement.
 *
 * Only traffic that a real, currently-present end user initiated for their own
 * account is exempt from the prospection kill switch:
 *   - `otp`           : one-time code the user just requested
 *   - `auth`          : sign-in / password / security notification
 *   - `transactional` : receipt, booking confirmation, real customer notice
 *
 * Explicitly NOT exempt (they are commercial or autonomous traffic):
 *   test, founder, onboarding, reengagement, recruitment, campaign, outreach,
 *   curiosity, relance, activation, other.
 */
const TRANSACTIONAL_MESSAGE_TYPES = ["otp", "auth", "transactional"] as const;

export function isTransactionalMessageType(type: string): boolean {
  return (TRANSACTIONAL_MESSAGE_TYPES as readonly string[]).includes(
    String(type ?? "").trim().toLowerCase(),
  );
}

/**
 * Admin diagnostic sends require their OWN explicit flag plus an allowlisted
 * destination. With the current P0 posture that flag is absent, so this always
 * returns false and every diagnostic send stays blocked.
 */
export const ADMIN_DIAGNOSTIC_FLAG_KEY = "ADMIN_DIAGNOSTIC_SEND_ENABLED";

export function isAllowlistedDiagnostic(
  destination: string,
  flagValue: unknown,
  allowlist: readonly string[],
): boolean {
  if (flagValue !== true) return false;
  return allowlist.includes(String(destination ?? "").trim());
}
