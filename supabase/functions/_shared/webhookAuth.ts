// Fail-closed entry decision for the Stripe webhook.
// External POSTs are NEVER trusted without the live signing secret:
// - STRIPE_WEBHOOK_SECRET missing/blank => reject (503), even before parsing;
// - the internal replay branch requires an exact, non-empty SERVICE_ROLE_KEY
//   match and is the only path allowed to skip Stripe signature verification.

export type WebhookEntryDecision =
  | "reject_unavailable" // live signing secret missing: fail closed
  | "replay" // authenticated internal replay: signature check bypassed
  | "verify_signature"; // normal path: Stripe signature must verify

export function webhookEntryDecision(args: {
  liveSecret: string | null | undefined;
  testSecret: string | null | undefined;
  replayToken: string | null | undefined;
  serviceRoleKey: string | null | undefined;
}): WebhookEntryDecision {
  const serviceRoleKey = (args.serviceRoleKey ?? "").trim();
  const replayToken = (args.replayToken ?? "").trim();
  // Replay is gated on a non-empty service role key with an exact match.
  // An empty/whitespace key can never authorize a replay.
  if (serviceRoleKey.length > 0 && replayToken.length > 0 && replayToken === serviceRoleKey) {
    return "replay";
  }
  const hasLive = !!args.liveSecret && args.liveSecret.trim().length > 0;
  // External requests fail closed when the live secret is missing, even if a
  // test secret exists: a test secret alone never authorizes external traffic.
  if (!hasLive) return "reject_unavailable";
  return "verify_signature";
}

// Ordered secrets to try when verifying a signature: live first, test as
// fallback so test-mode events verify for real (never forged, never skipped).
// Only called when the live secret is present (see webhookEntryDecision).
export function verificationSecrets(args: {
  liveSecret: string | null | undefined;
  testSecret: string | null | undefined;
}): string[] {
  const out: string[] = [];
  if (args.liveSecret && args.liveSecret.trim().length > 0) out.push(args.liveSecret);
  if (args.testSecret && args.testSecret.trim().length > 0) out.push(args.testSecret);
  return out;
}
