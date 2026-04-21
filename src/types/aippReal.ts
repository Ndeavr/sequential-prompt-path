export type AippConfidence = "low" | "medium" | "high";
export type AippAnalysisStatus = "pending" | "running" | "partial" | "complete" | "failed";

export type AippCategoryBreakdown = {
  key: "web" | "google" | "trust" | "aiVisibility" | "conversion";
  label: string;
  score: number;
  maxScore: number;
  summary: string;
  details: string[];
};

export type AippSourceStatus = {
  key: string;
  label: string;
  status: "validated" | "in_progress" | "unavailable";
};

export type AippBlocker = {
  technicalKey: string;
  title: string;
  body: string;
  impact: "low" | "medium" | "high";
  fix: string;
};

export type AippStrength = {
  title: string;
  body?: string;
};

export type AippAuditViewModel = {
  auditId: string | null;
  companyName: string;
  overallScore: number | null;
  potentialScore: number | null;
  statusLabel: string | null;
  analysisStatus: AippAnalysisStatus;
  confidenceLevel: AippConfidence;
  lastUpdatedAt: string | null;
  validatedSourcesCount: number;
  validatedSignalsCount: number;
  totalPossibleSignalsCount: number;
  sources: AippSourceStatus[];
  breakdown: AippCategoryBreakdown[];
  blockers: AippBlocker[];
  strengths: AippStrength[];
  actionPlan: string[];
  isProvisional: boolean;
  rawSignals?: any[];
  scoringDetails?: any;
  jobProgress?: number;
  jobStepKey?: string;
};
