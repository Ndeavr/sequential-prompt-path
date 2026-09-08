// UNPRO — P0: verification reuse rules (stop paying Twilio Lookup twice).
//
// Canada frequently returns line_type_intelligence unavailable: the number is
// structurally valid (`number_valid=true`) but `phone_line_type="unknown"` and
// the stored tier is C. That IS a verified record and must be reused from cache
// within the TTL — a concrete line type is NEVER required, at any layer.

export const VERIFICATION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days (>= 30d minimum)

/** Tiers that represent an accepted, contactable verification outcome. */
export const VERIFIED_TIERS = ["A", "B", "C", "D"] as const;

export type VerificationRecord = {
  phone_e164?: string | null;
  verification_status?: string | null;
  phone_line_type?: string | null;
  sms_eligibility_tier?: string | null;
  verified_at?: string | null;
  number_valid?: boolean | null;
};

/** A canonical normalized North-American E.164 destination. */
export function isNormalizedE164(phone: unknown): boolean {
  return typeof phone === "string" && /^\+[1-9]\d{7,14}$/.test(phone.trim());
}

/**
 * Canonical freshness rule. Depends ONLY on:
 *   number_valid (not explicitly false) + tier in A/B/C/D
 *   + normalized phone_e164 + verified_at inside the TTL.
 * `phone_line_type = "unknown"` is fully acceptable (tier C, Canada LTI off).
 */
export function isVerificationFresh(
  p: VerificationRecord,
  nowMs: number = Date.now(),
  ttlMs: number = VERIFICATION_TTL_MS,
): boolean {
  if (p.verification_status !== "verified") return false;
  if (p.number_valid === false) return false;
  if (!isNormalizedE164(p.phone_e164)) return false;
  if (!p.verified_at) return false;
  const ts = new Date(p.verified_at).getTime();
  if (!Number.isFinite(ts)) return false;
  if (nowMs - ts >= ttlMs) return false;

  const tier = (p.sms_eligibility_tier ?? "").toUpperCase();
  return (VERIFIED_TIERS as readonly string[]).includes(tier);
}

export type ProvenanceRecord = {
  website_url?: string | null;
  google_business_url?: string | null;
  google_place_id?: string | null;
  phone_source_url?: string | null;
  source_urls?: Record<string, unknown> | null;
};

export function hasPublicProvenance(p: ProvenanceRecord): boolean {
  return Boolean(
    p.website_url ||
    p.google_business_url ||
    p.google_place_id ||
    p.phone_source_url ||
    (p.source_urls as Record<string, unknown> | null)?.official_registry,
  );
}

export const LOOKUP_BACKOFF_MIN = [30, 120, 720, 2880] as const;

export function nextActionAt(attempt: number, nowMs: number = Date.now()): string {
  const idx = Math.min(Math.max(attempt, 1) - 1, LOOKUP_BACKOFF_MIN.length - 1);
  return new Date(nowMs + LOOKUP_BACKOFF_MIN[idx] * 60_000).toISOString();
}

// ---------------------------------------------------------------------------
// Canonical acquisition_queue vocabulary (must match the SQL CHECK constraint).
// ---------------------------------------------------------------------------
export const QUEUE_ACTIVE_STATES = [
  "new",
  "verified",
  "ready_sms",
  "ready_email",
  "needs_enrichment",
  "retry",
] as const;

export const QUEUE_TERMINAL_STATES = [
  "contacted",
  "delivered",
  "clicked",
  "activated",
  "failed",
  "skipped",
  "blocked",
  "quarantined",
] as const;

export const QUEUE_ALL_STATES = [...QUEUE_ACTIVE_STATES, ...QUEUE_TERMINAL_STATES] as const;

export function isQueueStateActive(state: unknown): boolean {
  return (QUEUE_ACTIVE_STATES as readonly string[]).includes(String(state ?? ""));
}

export function isQueueStateTerminal(state: unknown): boolean {
  return (QUEUE_TERMINAL_STATES as readonly string[]).includes(String(state ?? ""));
}

/** A queue row is workable only when active AND due. */
export function isQueueRowDue(
  row: { state?: unknown; next_action_at?: string | null },
  nowMs: number = Date.now(),
): boolean {
  if (!isQueueStateActive(row.state)) return false;
  if (!row.next_action_at) return true;
  const due = new Date(row.next_action_at).getTime();
  if (!Number.isFinite(due)) return true;
  return due <= nowMs;
}
