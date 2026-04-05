/**
 * UNPRO — Contractor Onboarding AIPP Activation Funnel Types
 */

// ─── Funnel Steps ───
export const FUNNEL_STEPS = [
  "landing",
  "onboarding_start",
  "import_workspace",
  "aipp_builder",
  "assets_studio",
  "faq_builder",
  "plan_recommendation",
  "checkout",
  "activation",
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

// ─── Status Enums ───
export type AccountStatus = "invited" | "active" | "suspended" | "archived";
export type OnboardingStatus = "not_started" | "in_progress" | "imported" | "reviewing" | "completed";
export type ActivationStatus = "not_ready" | "pending_payment" | "paid_pending" | "ready_to_publish" | "active" | "paused";
export type ImportStatus = "queued" | "running" | "partial" | "failed" | "completed";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

// ─── Import Source ───
export interface ImportSourceState {
  id: string;
  sourceName: string;
  sourceUrl?: string;
  status: "searching" | "matching" | "found" | "partial" | "failed" | "retrying" | "completed";
  confidenceScore: number;
  message?: string;
}

export const IMPORT_SOURCE_NAMES = [
  "Google Business",
  "Site Web",
  "RBQ",
  "NEQ",
  "Avis Google",
  "Facebook",
  "Instagram",
  "LinkedIn",
  "Pages Jaunes",
] as const;

// ─── Import Timeline Step ───
export interface ImportTimelineStep {
  key: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
  message?: string;
}

export const IMPORT_TIMELINE_STEPS: ImportTimelineStep[] = [
  { key: "detect", label: "Détection entreprise", status: "pending" },
  { key: "validate", label: "Validation identité", status: "pending" },
  { key: "services", label: "Extraction services", status: "pending" },
  { key: "zones", label: "Extraction zones desservies", status: "pending" },
  { key: "licenses", label: "Détection licences", status: "pending" },
  { key: "reviews", label: "Extraction avis", status: "pending" },
  { key: "media", label: "Détection images/logo", status: "pending" },
  { key: "website", label: "Analyse du site", status: "pending" },
  { key: "profile", label: "Génération profil AIPP", status: "pending" },
  { key: "score", label: "Calcul score", status: "pending" },
  { key: "plan", label: "Recommandation plan", status: "pending" },
];

// ─── Profile Completeness Radar ───
export interface CompletenessAxis {
  axis: string;
  value: number; // 0-100
  label: string;
}

export const COMPLETENESS_AXES: CompletenessAxis[] = [
  { axis: "identity", value: 0, label: "Identité" },
  { axis: "compliance", value: 0, label: "Conformité" },
  { axis: "content", value: 0, label: "Contenu" },
  { axis: "social_proof", value: 0, label: "Preuve sociale" },
  { axis: "visual", value: 0, label: "Visuel" },
  { axis: "specialization", value: 0, label: "Spécialisation" },
  { axis: "territory", value: 0, label: "Territoire" },
  { axis: "convertibility", value: 0, label: "Convertibilité" },
];

// ─── Profile Gap ───
export interface ProfileGap {
  id: string;
  gapType: string;
  gapLabel: string;
  severity: "low" | "medium" | "high" | "critical";
  impactScore: number;
  suggestedAction: string;
  resolved: boolean;
}

// ─── AIPP Score ───
export interface AIPPScoreBreakdown {
  overall: number;
  trust: number;
  completeness: number;
  visibility: number;
  conversion: number;
}

// ─── Business Objectives ───
export interface BusinessObjectives {
  goalMoreAppointments: boolean;
  goalVisibilityGoogle: boolean;
  goalVisibilityAi: boolean;
  goalFillSchedule: boolean;
  goalExclusivity: boolean;
  goalPremiumProjects: boolean;
  targetMonthlyRevenue: number;
  targetWeeklyCapacity: number;
  targetRadiusKm: number;
  urgencyLevel: "low" | "moderate" | "high" | "urgent";
  growthStage: "starting" | "growing" | "established" | "scaling";
}

// ─── Plan Fit ───
export interface PlanFit {
  planId: string;
  planName: string;
  fitScore: number;
  isRecommended: boolean;
  reasoning: string;
  projectedAppointmentsMonthly: number;
  projectedVisibilityGain: number;
  projectedRevenueRange: { min: number; max: number };
  monthlyPrice: number;
}

// ─── Activation Checklist ───
export interface ActivationChecklistItem {
  key: string;
  label: string;
  status: "pending" | "completed" | "skipped";
  required: boolean;
}

export const DEFAULT_ACTIVATION_CHECKLIST: ActivationChecklistItem[] = [
  { key: "identity", label: "Identité validée", status: "pending", required: true },
  { key: "contact", label: "Coordonnées validées", status: "pending", required: true },
  { key: "plan_paid", label: "Plan payé", status: "pending", required: true },
  { key: "logo", label: "Logo présent", status: "pending", required: true },
  { key: "primary_service", label: "Service principal choisi", status: "pending", required: true },
  { key: "service_area", label: "Zone desservie définie", status: "pending", required: true },
  { key: "photos", label: "Minimum 3 photos", status: "pending", required: false },
  { key: "license", label: "Licence si applicable", status: "pending", required: false },
  { key: "terms", label: "Conditions acceptées", status: "pending", required: true },
];

// ─── Funnel State ───
export interface ContractorFunnelState {
  currentStep: FunnelStep;
  contractorId?: string;
  // Step 1: Onboarding start
  businessName: string;
  website: string;
  phone: string;
  address: string;
  city: string;
  rbqNumber: string;
  googleBusinessUrl: string;
  importMode: "auto" | "manual";
  // Import state
  importJobId?: string;
  importSources: ImportSourceState[];
  importTimeline: ImportTimelineStep[];
  importProgress: number;
  // Profile
  aippScore?: AIPPScoreBreakdown;
  profileGaps: ProfileGap[];
  completenessAxes: CompletenessAxis[];
  // Objectives
  objectives?: BusinessObjectives;
  // Plan
  planFits: PlanFit[];
  selectedPlanId?: string;
  // Checkout
  checkoutSessionId?: string;
  // Activation
  activationChecklist: ActivationChecklistItem[];
}

export const DEFAULT_FUNNEL_STATE: ContractorFunnelState = {
  currentStep: "landing",
  businessName: "",
  website: "",
  phone: "",
  address: "",
  city: "",
  rbqNumber: "",
  googleBusinessUrl: "",
  importMode: "auto",
  importSources: [],
  importTimeline: [...IMPORT_TIMELINE_STEPS],
  importProgress: 0,
  profileGaps: [],
  completenessAxes: [...COMPLETENESS_AXES],
  planFits: [],
  activationChecklist: [...DEFAULT_ACTIVATION_CHECKLIST],
};

// ─── Revenue Projection ───
export type ProjectionMode = "conservative" | "realistic" | "ambitious";

export interface RevenueProjection {
  mode: ProjectionMode;
  appointmentsIncluded: number;
  costPerAppointment: number;
  potentialMonthlyValue: number;
  potentialAnnualValue: number;
  breakEvenMonths: number;
  projectsToBreakEven: number;
  revenueRange: { min: number; max: number };
}

// ─── FAQ ───
export interface ContractorFAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  relatedServiceId?: string;
  isPublished: boolean;
  sortOrder: number;
  sourceType: "ai_generated" | "manual";
}

export const FAQ_CATEGORIES = [
  "services",
  "prix",
  "délais",
  "garanties",
  "matériaux",
  "préparation",
  "permis",
  "subventions",
  "assurance",
  "territoire",
  "urgences",
  "après-travaux",
] as const;
