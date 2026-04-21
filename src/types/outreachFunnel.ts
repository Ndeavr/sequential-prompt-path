/**
 * UNPRO — Outreach Funnel & Sniper Engine Types
 */

// ─── Outreach Landing ───
export type OutreachLandingPayload = {
  businessName: string;
  city?: string;
  websiteUrl?: string;
  phone?: string;
  rbqNumber?: string;
  neqNumber?: string;
  category?: string;
  serviceAreas?: string[];
  sourceCampaign?: string;
  detectedSignals?: {
    websiteFound?: boolean;
    httpsEnabled?: boolean;
    googleProfileLikely?: boolean;
    phoneDetected?: boolean;
    servicesDetected?: boolean;
    rbqPending?: boolean;
  };
  preAuditStatus?: "not_started" | "prepared" | "partial" | "complete";
  precomputedAuditId?: string | null;
  founderMode?: boolean;
};

export type OutreachPageViewModel = {
  businessName: string;
  city: string | null;
  websiteUrl: string | null;
  category: string | null;
  founderMode: boolean;
  preAuditStatus: "not_started" | "prepared" | "partial" | "complete";
  detectedSignals: Array<{
    label: string;
    status: "detected" | "pending" | "unavailable";
  }>;
  primaryCtaLabel: string;
  secondaryCtaLabel?: string;
  confirmationRequired: boolean;
  targetId: string;
  secureToken: string;
  slug: string;
  preAuditId: string | null;
  contractorId: string | null;
};

// ─── Audit Intake Funnel ───
export type FunnelStep =
  | "landing"
  | "intake"
  | "running"
  | "reveal"
  | "recommendation"
  | "checkout"
  | "success";

export type IntakeData = {
  businessName: string;
  websiteUrl?: string;
  phone?: string;
  city: string;
  rbqNumber?: string;
  email?: string;
};

export type PlanGoal =
  | "visibility"
  | "appointments"
  | "conversion"
  | "ai_presence"
  | "territory";

export type RecommendedPlan = "recrue" | "pro" | "premium" | "elite" | "signature";

export type FunnelViewModel = {
  step: FunnelStep;
  sessionId: string | null;
  sessionToken: string | null;
  intake: IntakeData | null;
  contractorId: string | null;
  auditId: string | null;
  auditScore: number | null;
  confidenceLevel: "low" | "medium" | "high" | null;
  recommendedPlan: RecommendedPlan | null;
  selectedPlan: RecommendedPlan | null;
  goal: PlanGoal | null;
  isFounderMode: boolean;
};

// ─── Sniper Engine ───
export type SniperPriorityInput = {
  hasWebsite: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  categoryValueTier: "low" | "medium" | "high";
  territoryDemandTier: "low" | "medium" | "high";
  likelyAippWeakness: "low" | "medium" | "high";
  founderEligible: boolean;
  supplyNeedTier: "low" | "medium" | "high";
};

export type SniperTargetViewModel = {
  id: string;
  businessName: string;
  city: string | null;
  category: string | null;
  websiteUrl: string | null;
  phone: string | null;
  email: string | null;
  enrichmentStatus: string;
  outreachStatus: string;
  sniperPriorityScore: number | null;
  heatScore: number;
  founderEligible: boolean;
  recommendedChannel: string | null;
  tags: string[];
  createdAt: string;
};

export type SniperPipelineStats = {
  imported: number;
  enriched: number;
  pageReady: number;
  sent: number;
  engaged: number;
  auditStarted: number;
  converted: number;
};
