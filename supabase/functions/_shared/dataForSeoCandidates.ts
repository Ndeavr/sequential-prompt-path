/**
 * Candidate selection for `dataforseo-enrich-official`.
 *
 * TARGETED enrichment only: every candidate MUST already exist in
 * `official_source_records` with an official `source_kind`. DataForSEO is
 * never used for discovery.
 *
 * Two eligibility paths:
 *   a) contact_status = 'needs_enrichment'  → missing_contact
 *   b) no website_url/official_domain AND eligibility_status = 'eligible'
 *                                          → missing_website
 *   (both)                                  → missing_contact_and_website
 */

export const OFFICIAL_SOURCE_KINDS = ["rbq", "req", "novoclimat"] as const;
export type OfficialSourceKind = (typeof OFFICIAL_SOURCE_KINDS)[number];

export type CandidateReason =
  | "missing_contact"
  | "missing_website"
  | "missing_contact_and_website";

export type CandidateRecord = {
  id: string;
  source_kind?: string | null;
  business_name?: string | null;
  business_name_norm?: string | null;
  neq?: string | null;
  rbq_license?: string | null;
  city?: string | null;
  municipality?: string | null;
  region?: string | null;
  postal_code?: string | null;
  website_url?: string | null;
  official_domain?: string | null;
  contact_status?: string | null;
  enrichment_status?: string | null;
  eligibility_status?: string | null;
  dedupe_status?: string | null;
  blocked_reason?: string | null;
};

export type AttemptState = {
  status?: string | null;
  next_eligible_at?: string | null;
  attempt_count?: number | null;
};

/** Records we must never touch, regardless of missing data. */
const BLOCKED_CONTACT_STATUSES = new Set([
  "suppressed",
  "blocked",
  "opted_out",
  "opt_out",
  "do_not_contact",
  "unsubscribed",
]);

const TERMINAL_ATTEMPT_STATUSES = new Set(["failed_terminal"]);

export function isOfficialSourceKind(kind: string | null | undefined): boolean {
  return !!kind && (OFFICIAL_SOURCE_KINDS as readonly string[]).includes(kind);
}

export function hasWebsite(r: CandidateRecord): boolean {
  const site = (r.website_url ?? "").trim();
  const domain = (r.official_domain ?? "").trim();
  return site.length > 0 || domain.length > 0;
}

/** Deterministic reason, or null when the record is not a candidate at all. */
export function candidateReason(r: CandidateRecord): CandidateReason | null {
  const missingContact = r.contact_status === "needs_enrichment";
  const missingWebsite = !hasWebsite(r) && r.eligibility_status === "eligible";
  if (missingContact && missingWebsite) return "missing_contact_and_website";
  if (missingContact) return "missing_contact";
  if (missingWebsite) return "missing_website";
  return null;
}

export type EligibilityVerdict =
  | { eligible: true; reason: CandidateReason }
  | { eligible: false; skip_reason: string };

export function evaluateCandidate(
  r: CandidateRecord,
  attempt: AttemptState | undefined,
  nowIso: string,
): EligibilityVerdict {
  if (!isOfficialSourceKind(r.source_kind)) {
    return { eligible: false, skip_reason: "not_official_source" };
  }
  if (r.dedupe_status === "known") {
    return { eligible: false, skip_reason: "already_known" };
  }
  if (BLOCKED_CONTACT_STATUSES.has(String(r.contact_status ?? ""))) {
    return { eligible: false, skip_reason: "suppressed_or_opted_out" };
  }
  const reason = candidateReason(r);
  if (!reason) return { eligible: false, skip_reason: "nothing_to_enrich" };

  if (attempt) {
    if (TERMINAL_ATTEMPT_STATUSES.has(String(attempt.status ?? ""))) {
      return { eligible: false, skip_reason: "attempt_terminal" };
    }
    if (attempt.next_eligible_at && attempt.next_eligible_at > nowIso) {
      return { eligible: false, skip_reason: "cache_window" };
    }
  }
  return { eligible: true, reason };
}

/**
 * Update payload applied to `official_source_records` after a MATCH.
 * Aggregator data is additive only: it never overwrites official-source
 * phone/email and never promotes a published contact_status.
 */
export function buildMatchUpdate(
  r: CandidateRecord,
  item: { url?: string | null; phone?: string | null; title?: string | null },
  matchScore: number,
  nowIso: string,
): Record<string, unknown> {
  const update: Record<string, unknown> = {
    enrichment_status: item.url ? "pending_website_confirmation" : "aggregator_only",
    updated_at: nowIso,
    provenance: {
      dataforseo: {
        matched_at: nowIso,
        match_score: matchScore,
        phone: item.phone ?? null,
        website: item.url ?? null,
        trust: "aggregator_sourced",
        confirmed_by_official_site: false,
      },
    },
  };
  // Website is only written when the record has none. Never overwrite.
  if (item.url && !hasWebsite(r)) update.website_url = item.url;
  // contact_status, phone_e164 and email are intentionally NEVER written here.
  return update;
}
