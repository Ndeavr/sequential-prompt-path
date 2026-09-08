// UNPRO — P0 fail-closed outreach gate.
//
// Single source of truth for "may this process contact a real prospect?".
// Every sender AND every paid verification (Twilio Lookup) path must call
// `assertOutreachEnabled()` BEFORE invoking any provider.
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
 * Transactional message classes that must NEVER be blocked by the prospection
 * kill switch (OTP, admin tests, founder system alerts).
 */
export function isTransactionalMessageType(type: string): boolean {
  return ["otp", "test", "founder", "auth", "transactional"].includes(String(type ?? "").toLowerCase());
}
