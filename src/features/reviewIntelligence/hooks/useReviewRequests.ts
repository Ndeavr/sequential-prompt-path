import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReviewRequest, ReviewV2, ReviewReputationScore } from "../types";

export function useReviewRequests(contractorId: string | undefined) {
  return useQuery({
    queryKey: ["review-requests", contractorId],
    enabled: !!contractorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_requests" as any)
        .select("*")
        .eq("contractor_id", contractorId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReviewRequest[];
    },
  });
}

export function useReviews(contractorId: string | undefined) {
  return useQuery({
    queryKey: ["reviews-v2", contractorId],
    enabled: !!contractorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews_v2" as any)
        .select("*")
        .eq("contractor_id", contractorId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReviewV2[];
    },
  });
}

export function useReputation(contractorId: string | undefined) {
  return useQuery({
    queryKey: ["review-reputation", contractorId],
    enabled: !!contractorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_reputation_scores" as any)
        .select("*")
        .eq("contractor_id", contractorId!)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data as unknown as ReviewReputationScore | null;
    },
  });
}

export function useSendReviewRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      contractor_id: string;
      homeowner_name: string;
      phone?: string;
      email?: string;
      project_type?: string;
      city?: string;
      completion_date?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("review-request-send", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["review-requests"] });
    },
  });
}
