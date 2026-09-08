// UNPRO — P0: verification reuse rules (stop paying Twilio Lookup twice).
//
// Canada frequently returns line_type_intelligence unavailable: the number is
// structurally valid (`number_valid=true`) but `phone_line_type="unknown"` and
// the stored tier is C. That IS a verified record and must be reused from cache
// within the TTL — a concrete line type is NOT required.

export const VERIFICATION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days (>= 30d minimum)

/** Tiers that represent an accepted, contactable verification outcome. */
export const VERIFIED_TIERS = ["A", "B", "C", "D"] as const;

export type VerificationRecord = {
  verification_status?: string | null;
  phone_line_type?: string | null;
  sms_eligibility_tier?: string | null;
  verified_at?: string | null;
};

export function isVerificationFresh(
  p: VerificationRecord,
  nowMs: number = Date.now(),
  ttlMs: number = VERIFICATION_TTL_MS,
): boolean {
  if (p.verification_status !== "verified") return false;
  if (!p.verified_at) return false;
  const ts = new Date(p.verified_at).getTime();
  if (!Number.isFinite(ts)) return false;
  if (nowMs - ts >= ttlMs) return false;

  const tier = (p.sms_eligibility_tier ?? "").toUpperCase();
  const lineType = (p.phone_line_type ?? "").toLowerCase();
  const concreteLine = ["mobile", "landline", "voip"].includes(lineType);
  const allowedTier = (VERIFIED_TIERS as readonly string[]).includes(tier);

  // A concrete line type OR an allowed verified tier (notably C + unknown line
  // type caused by Canada LTI unavailability) is enough to reuse the cache.
  return concreteLine || allowedTier;
}

/** Public/CASL provenance evidence required BEFORE any paid Lookup. */
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

/** Bounded backoff (minutes) for transient Lookup/queue outcomes. */
export const LOOKUP_BACKOFF_MIN = [30, 120, 720, 2880] as const;

export function nextActionAt(attempt: number, nowMs: number = Date.now()): string {
  const idx = Math.min(Math.max(attempt, 1) - 1, LOOKUP_BACKOFF_MIN.length - 1);
  return new Date(nowMs + LOOKUP_BACKOFF_MIN[idx] * 60_000).toISOString();
}
