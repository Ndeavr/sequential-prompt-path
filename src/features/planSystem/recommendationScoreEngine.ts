/**
 * UNPRO — Recommendation Score Engine
 * Wraps the v_contractor_recommendation_score view.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContractorRecommendationScore {
  contractorId: string;
  planCode: string;
  visibilityMultiplier: number;
  recommendationMultiplier: number;
  aiIndexPriority: number;
  recommendationScore: number;
}

export function useContractorRecommendationScore(contractorId: string | null | undefined) {
  return useQuery({
    queryKey: ["recommendation-score", contractorId],
    enabled: !!contractorId,
    queryFn: async (): Promise<ContractorRecommendationScore | null> => {
      const { data, error } = await supabase
        .from("v_contractor_recommendation_score" as any)
        .select("*")
        .eq("contractor_id", contractorId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const r: any = data;
      return {
        contractorId: r.contractor_id,
        planCode: r.plan_code,
        visibilityMultiplier: Number(r.visibility_multiplier),
        recommendationMultiplier: Number(r.recommendation_multiplier),
        aiIndexPriority: r.ai_index_priority,
        recommendationScore: Number(r.recommendation_score),
      };
    },
    staleTime: 60_000,
  });
}
