/**
 * UNPRO — Activation profile types.
 * Shared between the /unpro/activate landing and the completion flow.
 */

export type Provenance = "verified" | "declared" | "inferred";

export interface ProfileFact {
  key: string;
  label: string;
  value: string;
  provenance: Provenance;
  source?: string;
}

export interface ReadinessCheck {
  key: string;
  label: string;
  ok: boolean;
}

export interface ActivationProfile {
  display_name: string | null;
  legal_name: string | null;
  trade: string | null;
  city: string | null;
  service_areas: string[];
  logo_url: string | null;
  website_url: string | null;
  website_host: string | null;
  google_business_url: string | null;
  has_google_listing: boolean;
  rating: number | null;
  review_count: number | null;
  review_summary: string | null;
  photo_count: number | null;
  rbq: string | null;
  rbq_verified: boolean;
  verification_status: string | null;
  verified_at: string | null;
  data_quality_score: number | null;
  facts: ProfileFact[];
  readiness: { score: number; checks: ReadinessCheck[] };
}

export interface ResolvedProspect {
  id: string;
  business_name: string | null;
  city: string | null;
  category: string | null;
  email: string | null;
  website_url?: string | null;
}

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  verified: "Vérifié",
  declared: "Déclaré",
  inferred: "Déduit",
};
