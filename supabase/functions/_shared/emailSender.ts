// UNPRO — Canonical email sender. Single source of truth.
// Any outbound email NOT using EMAIL_FROM must be rejected before send.
export const EMAIL_FROM = "Alex d'UNPRO <alex@mail.unpro.ca>";
export const EMAIL_FROM_ADDRESS = "alex@mail.unpro.ca";
export const EMAIL_FROM_NAME = "Alex d'UNPRO";
export const EMAIL_FROM_DOMAIN = "mail.unpro.ca";

export interface SenderGuardResult {
  ok: boolean;
  from: string;
  reason?: "EMAIL_SENDER_MISMATCH";
}

/** Returns the canonical sender, optionally logging a mismatch if a caller tried to override. */
export function assertSender(requested?: string | null): SenderGuardResult {
  if (!requested) return { ok: true, from: EMAIL_FROM };
  const norm = requested.trim().toLowerCase();
  if (norm === EMAIL_FROM.toLowerCase() || norm === EMAIL_FROM_ADDRESS.toLowerCase()) {
    return { ok: true, from: EMAIL_FROM };
  }
  return { ok: false, from: EMAIL_FROM, reason: "EMAIL_SENDER_MISMATCH" };
}

/** Logs an EMAIL_SENDER_MISMATCH to system_events without throwing. */
export async function logSenderMismatch(
  sb: { from: (t: string) => { insert: (row: unknown) => Promise<unknown> } },
  attempted: string,
  context: Record<string, unknown> = {},
) {
  try {
    await sb.from("system_events").insert({
      event_type: "EMAIL_SENDER_MISMATCH",
      severity: "warning",
      payload: { attempted, expected: EMAIL_FROM, ...context },
      created_at: new Date().toISOString(),
    });
  } catch (_) { /* never throw */ }
}
