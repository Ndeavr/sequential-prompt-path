/**
 * UNPRO — Authority Score V2 Hook
 * Fetches and manages real authority score data from the database.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeAuthorityScore, type AuthorityMetrics, type AuthorityResult, DIMENSION_META } from "@/services/authorityScoreV2";

export interface AuthorityScoreRow {
  id: string;
  contractor_id: string;
  overall_score: number;
  confidence_level: number;
  completion_performance: number;
  review_quality: number;
  matching_precision: number;
  learning_reliability: number;
  execution_model: number;
  subcontract_network: number;
  responsiveness: number;
  stability: number;
  metrics_json: Record<string, unknown>;
  tags: string[];
  tier: string;
  computed_at: string;
}

export interface AuthorityEventRow {
  id: string;
  event_type: string;
  event_category: string;
  delta_score: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

function rowToResult(row: AuthorityScoreRow): AuthorityResult {
  return {
    overall: row.overall_score,
    dimensions: {
      completionPerformance: row.completion_performance,
      reviewQuality: row.review_quality,
      matchingPrecision: row.matching_precision,
      learningReliability: row.learning_reliability,
      executionModel: row.execution_model,
      subcontractNetwork: row.subcontract_network,
      responsiveness: row.responsiveness,
      stability: row.stability,
    },
    confidence: row.confidence_level,
    tier: row.tier,
    tags: row.tags ?? [],
  };
}

/** Default mock metrics for demo/empty state */
function getDefaultMetrics(): AuthorityMetrics {
  return {
    projectsCompleted: 12,
    projectsTotal: 14,
    noShowCount: 0,
    cancellationCount: 1,
    avgRating: 4.6,
    verifiedReviewCount: 8,
    totalReviewCount: 15,
    recentReviewCount: 4,
    leadsReceived: 22,
    leadsAccepted: 16,
    leadsRefusedValid: 4,
    leadsRefusedInvalid: 2,
    consistentRefusalPatterns: 72,
    profileAccuracyScore: 80,
    executionType: "direct",
    subcontractControlLevel: "high",
    partnerSuccessRate: 0.85,
    repeatCollaborations: 3,
    partnerAvgRating: 4.2,
    avgResponseTimeMinutes: 45,
    avgAcceptanceDelayMinutes: 120,
    accountAgeDays: 540,
    activityConsistencyScore: 75,
  };
}

export function useAuthorityScoreV2(contractorId: string | undefined) {
  const scoreQuery = useQuery({
    queryKey: ["authority-score-v2", contractorId],
    enabled: !!contractorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_authority_scores")
        .select("*")
        .eq("contractor_id", contractorId!)
        .eq("is_current", true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return rowToResult(data as unknown as AuthorityScoreRow);
      }

      // No DB score yet — compute from default metrics
      return computeAuthorityScore(getDefaultMetrics());
    },
  });

  const eventsQuery = useQuery({
    queryKey: ["authority-events", contractorId],
    enabled: !!contractorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_authority_events")
        .select("*")
        .eq("contractor_id", contractorId!)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as unknown as AuthorityEventRow[];
    },
  });

  const matchMetricsQuery = useQuery({
    queryKey: ["match-metrics", contractorId],
    enabled: !!contractorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_match_metrics")
        .select("*")
        .eq("contractor_id", contractorId!)
        .order("period_start", { ascending: false })
        .limit(6);

      if (error) throw error;
      return data ?? [];
    },
  });

  return {
    score: scoreQuery.data ?? null,
    events: eventsQuery.data ?? [],
    matchMetrics: matchMetricsQuery.data ?? [],
    isLoading: scoreQuery.isLoading,
    dimensionMeta: DIMENSION_META,
  };
}
