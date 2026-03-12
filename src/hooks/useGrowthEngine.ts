import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSyndicateProjects(syndicateId: string | undefined) {
  return useQuery({
    queryKey: ["syndicate-projects", syndicateId],
    enabled: !!syndicateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicate_projects")
        .select("*")
        .eq("syndicate_id", syndicateId!)
        .order("risk_score", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProjectInterests(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-interests", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicate_project_interests")
        .select("*, contractors(business_name, aipp_score, rating, review_count, verification_status)")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRunGrowthScan(syndicateId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("condo-growth-engine", {
        body: { syndicate_id: syndicateId, action: "scan" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["syndicate-projects", syndicateId] });
    },
  });
}

export function useAIRecommendations(syndicateId: string | undefined) {
  return useQuery({
    queryKey: ["growth-recommendations", syndicateId],
    enabled: !!syndicateId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("condo-growth-engine", {
        body: { syndicate_id: syndicateId, action: "ai_recommendations" },
      });
      if (error) throw error;
      return data?.recommendations ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useExpressInterest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { syndicate_id: string; project_id: string; estimated_price?: number; message?: string }) => {
      const { data, error } = await supabase.functions.invoke("condo-growth-engine", {
        body: { ...params, action: "express_interest" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["project-interests", vars.project_id] });
      qc.invalidateQueries({ queryKey: ["syndicate-projects", vars.syndicate_id] });
    },
  });
}
