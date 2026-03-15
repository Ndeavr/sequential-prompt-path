/**
 * UNPRO — Trust Label Utilities
 * Converts raw verification scores into user-friendly trust bands.
 * Never implies legal certification or absolute certainty.
 */

export type TrustBand = "solide" | "encourageant" | "prudence" | "incomplete";

export interface TrustLabel {
  band: TrustBand;
  label_fr: string;
  color: string; // Tailwind classes using semantic tokens
}

/**
 * Derive a trust band from an optional numeric score (0–100).
 * Returns null if no meaningful score is available.
 */
export function getTrustBand(score: number | null | undefined): TrustLabel | null {
  if (score == null || score < 0) return null;
  if (score >= 75) return { band: "solide", label_fr: "Solide", color: "text-success bg-success/8 border-success/20" };
  if (score >= 50) return { band: "encourageant", label_fr: "Encourageant", color: "text-accent bg-accent/8 border-accent/20" };
  if (score >= 25) return { band: "prudence", label_fr: "Prudence", color: "text-warning bg-warning/8 border-warning/20" };
  return { band: "incomplete", label_fr: "Validation incomplète", color: "text-muted-foreground bg-muted/50 border-border/40" };
}

/**
 * Derive a concise trust label for contractor cards based on verification state.
 * Rules:
 * - admin_verified = true → "Profil validé"
 * - strong public signals → "Bonne cohérence des informations"
 * - weak/missing → "Vérification limitée" or null
 */
export function getContractorTrustLabel(contractor: {
  admin_verified?: boolean;
  verification_status?: string | null;
  aipp_score?: number | null;
  rating?: number | null;
  review_count?: number | null;
}): { text: string; variant: TrustBand } | null {
  if (contractor.admin_verified === true) {
    return { text: "Profil validé", variant: "solide" };
  }

  // Strong public signals: verified status + decent score + some reviews
  const hasVerifiedStatus = contractor.verification_status === "verified";
  const hasDecentScore = (contractor.aipp_score ?? 0) >= 60;
  const hasReviews = (contractor.review_count ?? 0) >= 3;

  if (hasVerifiedStatus && hasDecentScore && hasReviews) {
    return { text: "Bonne cohérence des informations", variant: "encourageant" };
  }

  if (hasVerifiedStatus) {
    return { text: "Vérification limitée", variant: "prudence" };
  }

  return null;
}

/**
 * Compute a trust-based ranking boost for search sorting.
 * Returns a value 0–15 that can be added to sort priority.
 * This is ONE input among many — not a monopoly mechanic.
 */
export function computeTrustBoost(contractor: {
  admin_verified?: boolean;
  aipp_score?: number | null;
  rating?: number | null;
  review_count?: number | null;
}): number {
  let boost = 0;

  // Admin verified: strongest signal (+8)
  if (contractor.admin_verified === true) boost += 8;

  // Strong AIPP score: moderate signal (+0 to +4)
  const aipp = contractor.aipp_score ?? 0;
  if (aipp >= 80) boost += 4;
  else if (aipp >= 60) boost += 2;

  // Review signals: minor signal (+0 to +3)
  const reviews = contractor.review_count ?? 0;
  const rating = contractor.rating ?? 0;
  if (reviews >= 10 && rating >= 4.0) boost += 3;
  else if (reviews >= 5 && rating >= 3.5) boost += 1;

  return boost;
}
