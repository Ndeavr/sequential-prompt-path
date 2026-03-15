/**
 * UNPRO — Verification Output Types (Frontend)
 * Maps to the verify-contractor v2 edge function output contract.
 */

export type IdentityResolutionStatus =
  | "verified_internal_profile"
  | "verified_match"
  | "probable_match_needs_more_proof"
  | "ambiguous_match"
  | "no_reliable_match";

export interface MatchedEntity {
  id?: string;
  business_name: string | null;
  legal_name: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  address: string | null;
  rbq_number: string | null;
  neq: string | null;
}

export interface InternalProfile {
  found: boolean;
  admin_verified: boolean;
  used_admin_verified_profile: boolean;
  internal_verified_score: number | null;
  internal_verified_at: string | null;
  verification_status: string;
}

export interface VerificationDetail {
  rbq_status: string;
  neq_status: string;
  web_presence: string;
  reviews_summary: string;
  review_authenticity_signal: string;
  visual_consistency: string;
}

export interface VerificationScores {
  identity_confidence_score: number;
  public_trust_score: number;
  internal_verified_score: number | null;
  live_risk_delta: number | null;
}

export interface VerificationOutput {
  identity_resolution: {
    status: IdentityResolutionStatus;
    identity_confidence_score: number;
    summary: string;
    matched_entity: MatchedEntity;
  };
  internal_profile: InternalProfile;
  verification: VerificationDetail;
  scores: VerificationScores;
  strengths: string[];
  risks: string[];
  inconsistencies: string[];
  missing_proofs: string[];
  recommended_next_inputs: string[];
  admin: {
    admin_alert_created: boolean;
    admin_review_status: string;
  };
  final_recommendation: string;
}

export interface VerificationApiResponse {
  success: boolean;
  verification_run_id: string;
  output: VerificationOutput;
  error?: string;
}

/** Form input for the verification request */
export interface VerificationFormInput {
  phone?: string;
  business_name?: string;
  website?: string;
  rbq_number?: string;
  city?: string;
}

/** Evidence upload types */
export type EvidenceType = "business_card" | "truck" | "contract" | "quote";
