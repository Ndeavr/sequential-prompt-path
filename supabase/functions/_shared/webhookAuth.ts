// Fail-closed entry decision for the Stripe webhook.
// External POSTs are NEVER trusted without a usable signing secret:
// - no live secret AND no test secret => reject (503), even before parsing;
// - the internal replay branch requires an exact, non-empty SERVICE_ROLE_KEY
//   match and is the only path allowed to skip Stripe signature verification.

export type WebhookEntryDecision =
  | "reject_unavailable" // no signing secret configured: fail closed
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
  const hasTest = !!args.testSecret && args.testSecret.trim().length > 0;
  if (!hasLive && !hasTest) return "reject_unavailable";
  return "verify_signature";
}

// Ordered secrets to try when verifying a signature: live first, test as
// fallback so test-mode events verify for real (never forged, never skipped).
export function verificationSecrets(args: {
  liveSecret: string | null | undefined;
  testSecret: string | null | undefined;
}): string[] {
  const out: string[] = [];
  if (args.liveSecret && args.liveSecret.trim().length > 0) out.push(args.liveSecret);
  if (args.testSecret && args.testSecret.trim().length > 0) out.push(args.testSecret);
  return out;
}
