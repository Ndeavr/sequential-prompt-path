/**
 * UNPRO Contractor Verification Engine — Types
 */

/* ── Input ── */
export type SearchType = "phone" | "name" | "rbq" | "neq" | "website" | "upload";
export type ImageType = "truck" | "contract" | "business_card" | "invoice" | "storefront" | "logo" | "unknown";

export interface InputSummary {
  input_type: SearchType;
  raw_input: string;
  normalized_phone: string | null;
  detected_language: "fr" | "en" | "unknown";
}

/* ── Visual Extraction ── */
export interface VisualExtraction {
  image_type: ImageType | null;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  rbq: string | null;
  neq: string | null;
  address: string | null;
  representative_name: string | null;
  service_keywords: string[];
  brand_notes: string[];
}

/* ── Probable Entity ── */
export interface ProbableEntity {
  business_name: string | null;
  legal_name: string | null;
  normalized_phone: string | null;
  website: string | null;
  email_domain: string | null;
  probable_service_category: string | null;
  probable_city: string | null;
  probable_rbq: string | null;
  probable_neq: string | null;
  confidence_score: number;
  evidence: string[];
}

/* ── Registry Validation ── */
export type RbqStatus = "valid" | "expired" | "suspended" | "not_found" | "unknown";
export type NeqStatus = "active" | "inactive" | "struck_off" | "not_found" | "unknown";
export type IdentityCoherence = "strong" | "moderate" | "weak" | "contradictory" | "unknown";

export interface RegistryValidation {
  rbq_status: RbqStatus;
  rbq_subcategories: string[];
  neq_status: NeqStatus;
  registered_name: string | null;
  identity_coherence: IdentityCoherence;
}

/* ── License Scope ── */
export type ProjectFit = "compatible" | "partial" | "verify" | "incompatible" | null;

export interface MappedWorkType {
  rbq_code: string;
  label_fr: string;
  work_types: string[];
}

export interface LicenseScope {
  mapped_work_types: MappedWorkType[];
  project_fit: ProjectFit;
  license_fit_score: number;
  explanation_fr: string;
}

/* ── Risk Signals ── */
export type RiskSeverity = "low" | "medium" | "high";

export interface RiskSignal {
  signal: string;
  severity: RiskSeverity;
  detail: string;
}

/* ── Scores ── */
export interface VerificationScores {
  visual_trust_score: number;
  unpro_trust_score: number;
  license_fit_score: number;
}

/* ── Verdict ── */
export type Verdict = "succes" | "attention" | "non_succes" | "se_tenir_loin";

export interface VerdictSummary {
  headline: string;
  short_summary: string;
  next_steps: string[];
}

/* ── Full Report ── */
export interface VerificationReport {
  input_summary: InputSummary;
  visual_extraction: VisualExtraction;
  probable_entities: ProbableEntity[];
  registry_validation: RegistryValidation;
  license_scope: LicenseScope;
  risk_signals: RiskSignal[];
  scores: VerificationScores;
  verdict: Verdict;
  summary_fr: VerdictSummary;
}
