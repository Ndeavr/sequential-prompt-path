/**
 * Privacy boundary for first-party browser funnel telemetry.
 * Claim/OTP/invitation credentials may be used to complete a flow, but must
 * never be copied into append-only analytics (including URLs or metadata).
 *
 * We intentionally keep prospect_id/session_id/UTMs for cohort attribution;
 * the raw token column must stay null. No migration or backend write here.
 */

const SECRET_KEY = /token|secret|password|passcode|otp|authorization|bearer|api[_-]?key|verification[_-]?code/i;

const TOKENIZED_PATHS = [
  /^(\/unpro\/(?:activate|audit)\/)[^/]+/i,
  /^(\/invitation\/)[^/]+/i,
  /^(\/(?:r|rdv)\/)[^/]+/i,
];

/** Only a route shape is necessary for analytics; drop every query/fragment. */
export function sanitizeFunnelPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw, "https://unpro.invalid");
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    let path = parsed.pathname;
    for (const route of TOKENIZED_PATHS) path = path.replace(route, "$1:token");
    return path;
  } catch {
    return null;
  }
}

/**
 * Redact credential-shaped fields (including nested legacy metadata) and
 * known bearer-token values before insert. Never log a full URL: even
 * non-token query parameters may contain private user input.
 */
export function sanitizeFunnelMetadata(
  metadata: Record<string, unknown>,
  knownTokens: Array<string | null | undefined> = [],
): Record<string, unknown> {
  const secrets = knownTokens.filter((value): value is string => typeof value === "string" && value.length > 0);
  const scrub = (value: unknown, key: string, depth: number): unknown => {
    if (SECRET_KEY.test(key)) return "[redacted]";
    if (depth > 8) return "[omitted]";
    if (typeof value === "string") {
      if (/^(?:https?:\/\/|\/)/i.test(value)) return sanitizeFunnelPath(value) ?? "[redacted]";
      if (/(?:^|[?&])(?:token|t|at|otp|code|access_token|refresh_token)=/i.test(value)) return "[redacted]";
      let safe = value;
      for (const token of secrets) safe = safe.split(token).join("[redacted]");
      return safe;
    }
    if (Array.isArray(value)) return value.map((item) => scrub(item, key, depth + 1));
    if (value && typeof value === "object") {
      const clean: Record<string, unknown> = {};
      for (const [childKey, childValue] of Object.entries(value)) {
        clean[childKey] = scrub(childValue, childKey, depth + 1);
      }
      return clean;
    }
    return value;
  };
  return scrub(metadata, "metadata", 0) as Record<string, unknown>;
}
