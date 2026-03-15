/**
 * UNPRO — Alex Verification Context Types
 * Structured data contract for trust-aware AI concierge.
 * These fields are injected into Alex's context when discussing a contractor.
 */

export type AlexTrustLevel =
  | "admin_verified"     // Internally validated by UnPRO team
  | "strong_coherence"   // Good public signal alignment
  | "incomplete"         // Some signals present but not enough
  | "ambiguous"          // Multiple possible matches or conflicting data
  | "concerning"         // Notable inconsistencies detected
  | "unknown";           // No verification data available

export interface AlexContractorVerificationContext {
  /** Contractor ID if matched */
  contractor_id: string;
  /** Business name for display */
  business_name: string;
  /** Overall trust level — drives Alex's tone */
  trust_level: AlexTrustLevel;
  /** Whether admin_verified badge is active */
  verified_badge_available: boolean;
  /** Human-readable verification summary for Alex */
  verification_summary: string;
  /** Trust label for concise display */
  trust_label: string;
  /** Last verification date if available */
  last_verified_at?: string | null;
  /** Missing proofs that could strengthen the profile */
  missing_proofs?: string[];
  /** Caution notes — user-safe wording only */
  caution_notes?: string[];
  /** AIPP score if available */
  aipp_score?: number | null;
  /** UNPRO score if available */
  unpro_score?: number | null;
  /** Duplicate detection flags — internal only, affects Alex tone */
  has_duplicate_flags?: boolean;
  /** Entity confidence from duplicate detection */
  entity_confidence?: string | null;
}

/**
 * Build Alex verification context from contractor data.
 * This is the single point of truth for what Alex knows about a contractor's trust.
 */
export function buildAlexVerificationContext(contractor: {
  id: string;
  business_name: string;
  admin_verified?: boolean;
  verification_status?: string | null;
  aipp_score?: number | null;
  rating?: number | null;
  review_count?: number | null;
  internal_verified_score?: number | null;
  internal_verified_at?: string | null;
}): AlexContractorVerificationContext {
  const isAdminVerified = contractor.admin_verified === true;
  const isVerified = contractor.verification_status === "verified";
  const aipp = contractor.aipp_score ?? 0;
  const reviews = contractor.review_count ?? 0;
  const rating = contractor.rating ?? 0;

  // Determine trust level
  let trust_level: AlexTrustLevel;
  let verification_summary: string;
  let trust_label: string;
  const missing_proofs: string[] = [];
  const caution_notes: string[] = [];

  if (isAdminVerified) {
    trust_level = "admin_verified";
    verification_summary = "Cet entrepreneur possède un profil validé par l'équipe UnPRO.";
    trust_label = "Profil validé";
  } else if (isVerified && aipp >= 65 && reviews >= 5 && rating >= 3.5) {
    trust_level = "strong_coherence";
    verification_summary = "Les informations publiques semblent cohérentes et pointent vers la même entreprise.";
    trust_label = "Bonne cohérence";
  } else if (isVerified && aipp >= 40) {
    trust_level = "incomplete";
    verification_summary = "Quelques signaux utiles sont présents, mais pas assez pour confirmer avec un haut niveau de certitude.";
    trust_label = "Vérification partielle";
    if (reviews < 3) missing_proofs.push("avis clients");
    if (aipp < 50) missing_proofs.push("informations de profil");
  } else if (isVerified) {
    trust_level = "ambiguous";
    verification_summary = "Plusieurs correspondances possibles ont été trouvées. La prudence est recommandée.";
    trust_label = "À confirmer";
    caution_notes.push("Identité commerciale à confirmer avec des éléments supplémentaires.");
  } else {
    trust_level = "unknown";
    verification_summary = "Aucune vérification n'a été effectuée pour cet entrepreneur.";
    trust_label = "Non vérifié";
  }

  return {
    contractor_id: contractor.id,
    business_name: contractor.business_name,
    trust_level,
    verified_badge_available: isAdminVerified,
    verification_summary,
    trust_label,
    last_verified_at: contractor.internal_verified_at ?? null,
    missing_proofs: missing_proofs.length > 0 ? missing_proofs : undefined,
    caution_notes: caution_notes.length > 0 ? caution_notes : undefined,
    aipp_score: contractor.aipp_score,
    unpro_score: contractor.internal_verified_score,
  };
}
