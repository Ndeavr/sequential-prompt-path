/**
 * UNPRO — Contractor Engine Types
 * Types for capabilities, exclusions, subcontracting, teams, and partner network.
 */

// ─── Capabilities & Exclusions ───
export interface ContractorCapability {
  id: string;
  contractor_id: string;
  capability_type: string;
  category_slug?: string | null;
  service_slug?: string | null;
  material_slug?: string | null;
  structure_type?: string | null;
  building_type?: string | null;
  confidence: number;
  source: string;
  is_active: boolean;
}

export interface ContractorExclusion {
  id: string;
  contractor_id: string;
  exclusion_type: string;
  category_slug?: string | null;
  service_slug?: string | null;
  material_slug?: string | null;
  structure_type?: string | null;
  building_type?: string | null;
  reason_fr?: string | null;
  reason_en?: string | null;
  source: string;
  is_active: boolean;
}

// ─── Execution Model ───
export interface ContractorExecutionModel {
  id: string;
  contractor_id: string;
  execution_mode: "direct" | "hybrid" | "subcontract";
  works_as_subcontractor: boolean;
  accepts_subcontractors: boolean;
  preferred_project_sizes: string[];
  max_distance_km: number;
  availability_status: "available" | "busy" | "unavailable";
  notes?: string;
}

// ─── Project Match Card (Enriched for Contractor View) ───
export type MatchType = "perfect" | "partial" | "subcontract_needed";

export interface IncomingProject {
  id: string;
  appointment_id?: string;
  project_category: string;
  city: string;
  province?: string;
  match_score: number;
  match_type: MatchType;
  ai_summary_fr: string;
  urgency_level: string;
  estimated_value_cents?: number;
  budget_range?: string;
  timeline?: string;
  preferred_date?: string;
  scope_coverage: ScopeCoverage;
  match_reasons: MatchReason[];
  flags: ProjectFlag[];
  created_at: string;
}

export interface ScopeCoverage {
  in_scope: string[];
  out_of_scope: string[];
  coverage_percent: number;
}

export interface MatchReason {
  icon: string;
  text_fr: string;
  impact: "positive" | "neutral" | "negative";
}

export interface ProjectFlag {
  type: "perfect_match" | "partial_match" | "subcontract_needed" | "high_urgency" | "high_value";
  label_fr: string;
  color: "success" | "warning" | "destructive" | "primary";
}

// ─── Smart Decline ───
export type DeclineType = "simple" | "redirect" | "partner";

export interface SmartDeclinePayload {
  appointment_id: string;
  decline_type: DeclineType;
  reason_code?: string;
  reason_text?: string;
  redirect_contractor_id?: string;
}

// ─── Subcontract Request ───
export interface SubcontractRequest {
  id: string;
  requesting_contractor_id: string;
  project_id?: string;
  appointment_id?: string;
  scope_description: string;
  scope_slugs: string[];
  material_slugs: string[];
  structure_type?: string;
  city_slug?: string;
  status: "open" | "matched" | "accepted" | "completed" | "cancelled";
  matched_contractor_id?: string;
}

export interface SubcontractCandidate {
  contractor_id: string;
  business_name: string;
  specialty?: string;
  city?: string;
  authority_score: number;
  distance_km?: number;
  works_as_subcontractor: boolean;
  relationship_status: "worked_together" | "recommended" | "new";
  internal_trust_score?: number;
  match_score: number;
}

// ─── Partner Network ───
export interface ContractorRelationship {
  id: string;
  contractor_id: string;
  partner_contractor_id: string;
  relationship_type: "partner" | "subcontractor" | "referred";
  status: "active" | "inactive";
  internal_rating: number;
  success_rate: number;
  collaboration_count: number;
  is_favorite: boolean;
  is_blocked: boolean;
  private_notes?: string;
  partner?: {
    business_name: string;
    specialty?: string;
    city?: string;
    logo_url?: string;
    rating?: number;
  };
}

// ─── Team Builder ───
export interface ProjectTeam {
  id: string;
  lead_contractor_id: string;
  project_id?: string;
  appointment_id?: string;
  team_name?: string;
  status: "draft" | "active" | "completed";
  compatibility_score: number;
  confidence_score: number;
  members: ProjectTeamMember[];
}

export interface ProjectTeamMember {
  id: string;
  team_id: string;
  contractor_id: string;
  role_label: string;
  scope_slugs: string[];
  status: "invited" | "accepted" | "declined";
  contractor?: {
    business_name: string;
    specialty?: string;
    city?: string;
    logo_url?: string;
  };
}

// ─── Expertise Preview ───
export interface ExpertisePreview {
  included_examples: ExpertiseExample[];
  excluded_examples: ExpertiseExample[];
}

export interface ExpertiseExample {
  label_fr: string;
  reason_fr: string;
  category_slug?: string;
}
