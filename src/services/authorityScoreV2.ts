/**
 * UNPRO — Authority Score V2 Computation Engine
 * 8-dimension weighted scoring based on real performance signals.
 */

export interface AuthorityDimensions {
  completionPerformance: number; // 0-100
  reviewQuality: number;
  matchingPrecision: number;
  learningReliability: number;
  executionModel: number;
  subcontractNetwork: number;
  responsiveness: number;
  stability: number;
}

export interface AuthorityMetrics {
  // Completion
  projectsCompleted: number;
  projectsTotal: number;
  noShowCount: number;
  cancellationCount: number;
  // Reviews
  avgRating: number;
  verifiedReviewCount: number;
  totalReviewCount: number;
  recentReviewCount: number; // last 90d
  // Matching
  leadsReceived: number;
  leadsAccepted: number;
  leadsRefusedValid: number;
  leadsRefusedInvalid: number;
  // Learning
  consistentRefusalPatterns: number; // 0-100
  profileAccuracyScore: number; // 0-100
  // Execution
  executionType: "direct" | "hybrid" | "subcontract";
  subcontractControlLevel: "high" | "medium" | "low";
  // Network
  partnerSuccessRate: number;
  repeatCollaborations: number;
  partnerAvgRating: number;
  // Responsiveness
  avgResponseTimeMinutes: number;
  avgAcceptanceDelayMinutes: number;
  // Stability
  accountAgeDays: number;
  activityConsistencyScore: number; // 0-100
}

export interface AuthorityResult {
  overall: number; // 0-100
  dimensions: AuthorityDimensions;
  confidence: number; // 0-1
  tier: string;
  tags: string[];
}

const WEIGHTS = {
  completionPerformance: 0.25,
  reviewQuality: 0.20,
  matchingPrecision: 0.15,
  learningReliability: 0.10,
  executionModel: 0.10,
  subcontractNetwork: 0.10,
  responsiveness: 0.05,
  stability: 0.05,
} as const;

/** Compute completion performance (25%) */
function calcCompletion(m: AuthorityMetrics): number {
  if (m.projectsTotal === 0) return 0;
  const completionRate = m.projectsCompleted / m.projectsTotal;
  const noShowPenalty = Math.min(m.noShowCount * 15, 40);
  const cancelPenalty = Math.min(m.cancellationCount * 8, 30);
  return Math.max(0, Math.round(completionRate * 100 - noShowPenalty - cancelPenalty));
}

/** Compute review quality (20%) */
function calcReviewQuality(m: AuthorityMetrics): number {
  if (m.totalReviewCount === 0) return 0;
  const ratingScore = (m.avgRating / 5) * 50;
  const verifiedBonus = Math.min((m.verifiedReviewCount / Math.max(m.totalReviewCount, 1)) * 30, 30);
  const recencyBonus = Math.min(m.recentReviewCount * 4, 20);
  return Math.min(100, Math.round(ratingScore + verifiedBonus + recencyBonus));
}

/** Compute matching precision (15%) */
function calcMatchingPrecision(m: AuthorityMetrics): number {
  if (m.leadsReceived === 0) return 50; // neutral when no data
  const acceptRate = m.leadsAccepted / m.leadsReceived;
  const mismatchRate = m.leadsRefusedInvalid / Math.max(m.leadsReceived, 1);
  const precisionBase = acceptRate * 70;
  const mismatchPenalty = mismatchRate * 50;
  return Math.max(0, Math.min(100, Math.round(precisionBase + 30 - mismatchPenalty)));
}

/** Compute learning reliability (10%) */
function calcLearning(m: AuthorityMetrics): number {
  return Math.round((m.consistentRefusalPatterns * 0.6 + m.profileAccuracyScore * 0.4));
}

/** Compute execution model (10%) */
function calcExecution(m: AuthorityMetrics): number {
  const typeScores: Record<string, number> = { direct: 85, hybrid: 60, subcontract: 30 };
  const controlBonus: Record<string, number> = { high: 15, medium: 5, low: -10 };
  const base = typeScores[m.executionType] ?? 50;
  const bonus = m.executionType === "subcontract" ? (controlBonus[m.subcontractControlLevel] ?? 0) : 0;
  return Math.max(0, Math.min(100, base + bonus));
}

/** Compute subcontract network (10%) */
function calcNetwork(m: AuthorityMetrics): number {
  if (m.repeatCollaborations === 0 && m.partnerSuccessRate === 0) return 50;
  const successScore = m.partnerSuccessRate * 40;
  const repeatBonus = Math.min(m.repeatCollaborations * 10, 30);
  const ratingScore = (m.partnerAvgRating / 5) * 30;
  return Math.min(100, Math.round(successScore + repeatBonus + ratingScore));
}

/** Compute responsiveness (5%) */
function calcResponsiveness(m: AuthorityMetrics): number {
  // < 30 min = 100, > 1440 min (24h) = 0
  const responseScore = Math.max(0, 100 - (m.avgResponseTimeMinutes / 14.4));
  const acceptScore = Math.max(0, 100 - (m.avgAcceptanceDelayMinutes / 14.4));
  return Math.round((responseScore * 0.6 + acceptScore * 0.4));
}

/** Compute stability (5%) */
function calcStability(m: AuthorityMetrics): number {
  const ageScore = Math.min(m.accountAgeDays / 730 * 50, 50); // max at 2 years
  const consistencyScore = m.activityConsistencyScore * 0.5;
  return Math.round(ageScore + consistencyScore);
}

/** Compute confidence based on data availability */
function calcConfidence(m: AuthorityMetrics): number {
  let signals = 0;
  let total = 8;
  if (m.projectsTotal > 0) signals++;
  if (m.totalReviewCount > 0) signals++;
  if (m.leadsReceived > 0) signals++;
  if (m.consistentRefusalPatterns > 0) signals++;
  if (m.executionType) signals++;
  if (m.repeatCollaborations > 0 || m.partnerSuccessRate > 0) signals++;
  if (m.avgResponseTimeMinutes > 0) signals++;
  if (m.accountAgeDays > 30) signals++;
  return Math.round((signals / total) * 100) / 100;
}

function deriveTier(score: number): string {
  if (score >= 90) return "elite";
  if (score >= 75) return "authority";
  if (score >= 60) return "gold";
  if (score >= 40) return "silver";
  return "bronze";
}

function deriveTags(dims: AuthorityDimensions, m: AuthorityMetrics): string[] {
  const tags: string[] = [];
  if (dims.completionPerformance >= 90) tags.push("haute fiabilité");
  if (m.executionType === "direct" && dims.executionModel >= 80) tags.push("exécution directe");
  if (dims.matchingPrecision >= 85) tags.push("ultra spécialisé");
  if (dims.subcontractNetwork >= 75) tags.push("partenaire fiable");
  if (dims.reviewQuality >= 85) tags.push("excellents avis");
  if (dims.responsiveness >= 90) tags.push("très réactif");
  if (dims.stability >= 80) tags.push("entrepreneur établi");
  return tags;
}

/** Main computation */
export function computeAuthorityScore(metrics: AuthorityMetrics): AuthorityResult {
  const dimensions: AuthorityDimensions = {
    completionPerformance: calcCompletion(metrics),
    reviewQuality: calcReviewQuality(metrics),
    matchingPrecision: calcMatchingPrecision(metrics),
    learningReliability: calcLearning(metrics),
    executionModel: calcExecution(metrics),
    subcontractNetwork: calcNetwork(metrics),
    responsiveness: calcResponsiveness(metrics),
    stability: calcStability(metrics),
  };

  const overall = Math.round(
    dimensions.completionPerformance * WEIGHTS.completionPerformance +
    dimensions.reviewQuality * WEIGHTS.reviewQuality +
    dimensions.matchingPrecision * WEIGHTS.matchingPrecision +
    dimensions.learningReliability * WEIGHTS.learningReliability +
    dimensions.executionModel * WEIGHTS.executionModel +
    dimensions.subcontractNetwork * WEIGHTS.subcontractNetwork +
    dimensions.responsiveness * WEIGHTS.responsiveness +
    dimensions.stability * WEIGHTS.stability
  );

  const confidence = calcConfidence(metrics);
  const tier = deriveTier(overall);
  const tags = deriveTags(dimensions, metrics);

  return { overall, dimensions, confidence, tier, tags };
}

/** Dimension labels for UI */
export const DIMENSION_META: Record<keyof AuthorityDimensions, { label: string; weight: number; color: string }> = {
  completionPerformance: { label: "Performance de complétion", weight: 25, color: "hsl(152 69% 50%)" },
  reviewQuality: { label: "Qualité des avis", weight: 20, color: "hsl(38 85% 55%)" },
  matchingPrecision: { label: "Précision du matching", weight: 15, color: "hsl(234 89% 74%)" },
  learningReliability: { label: "Fiabilité d'apprentissage", weight: 10, color: "hsl(265 85% 68%)" },
  executionModel: { label: "Modèle d'exécution", weight: 10, color: "hsl(185 80% 55%)" },
  subcontractNetwork: { label: "Réseau de sous-traitance", weight: 10, color: "hsl(222 100% 65%)" },
  responsiveness: { label: "Réactivité", weight: 5, color: "hsl(340 75% 55%)" },
  stability: { label: "Stabilité", weight: 5, color: "hsl(45 90% 50%)" },
};

/** Tier labels for UI */
export const TIER_META: Record<string, { label: string; labelFr: string; color: string }> = {
  elite: { label: "Elite", labelFr: "Élite", color: "hsl(38 85% 55%)" },
  authority: { label: "Authority", labelFr: "Autorité", color: "hsl(265 85% 68%)" },
  gold: { label: "Gold", labelFr: "Or", color: "hsl(45 90% 50%)" },
  silver: { label: "Silver", labelFr: "Argent", color: "hsl(220 10% 65%)" },
  bronze: { label: "Bronze", labelFr: "Bronze", color: "hsl(25 60% 50%)" },
};
