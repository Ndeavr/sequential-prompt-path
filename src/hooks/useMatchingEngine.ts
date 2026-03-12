/**
 * UNPRO — useMatchingEngine Hook
 * Fetches match results for a project/user context.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { MatchEvaluation } from "@/types/matching";

export const useMatchResults = (projectId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["match-results", user?.id, projectId],
    queryFn: async (): Promise<MatchEvaluation[]> => {
      if (!user?.id) return [];

      let query = supabase
        .from("match_evaluations")
        .select(`
          *,
          contractors!inner (
            business_name, specialty, city, province, logo_url,
            rating, review_count, verification_status, years_experience
          )
        `)
        .eq("user_id", user.id)
        .order("recommendation_score", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,
        business_name: row.contractors?.business_name,
        specialty: row.contractors?.specialty,
        city: row.contractors?.city,
        province: row.contractors?.province,
        logo_url: row.contractors?.logo_url,
        rating: row.contractors?.rating,
        review_count: row.contractors?.review_count,
        verification_status: row.contractors?.verification_status,
        years_experience: row.contractors?.years_experience,
      }));
    },
    enabled: !!user?.id,
  });
};

export const useAlignmentQuestions = () => {
  return useQuery({
    queryKey: ["alignment-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alignment_questions")
        .select("*")
        .eq("is_active", true)
        .order("category");
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useContractorPublicScores = (contractorId?: string) => {
  return useQuery({
    queryKey: ["contractor-public-scores", contractorId],
    queryFn: async () => {
      if (!contractorId) return null;
      const { data, error } = await supabase
        .from("contractor_public_scores")
        .select("*")
        .eq("contractor_id", contractorId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!contractorId,
  });
};

export const useReviewInsights = (contractorId?: string) => {
  return useQuery({
    queryKey: ["review-insights", contractorId],
    queryFn: async () => {
      if (!contractorId) return null;
      const { data, error } = await supabase
        .from("review_insights")
        .select("*")
        .eq("contractor_id", contractorId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!contractorId,
  });
};
