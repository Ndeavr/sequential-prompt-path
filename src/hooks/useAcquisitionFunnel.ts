/**
 * Hook — Acquisition Pipeline dashboard data.
 * Reads funnel events, coverage, rejection reasons, live prospect list.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FunnelRow = {
  stage: string;
  source: string;
  city: string;
  category: string;
  count: number;
};

export type CoverageRow = {
  city: string;
  category: string;
  verified_count: number;
  ready_count: number;
  contacted_count: number;
  total_count: number;
};

export type RejectionRow = {
  reason_code: string;
  sample_reason_text: string | null;
  count: number;
};

export type PipelineEvent = {
  id: string;
  business_name: string | null;
  city: string | null;
  category: string | null;
  source: string | null;
  stage: string;
  reason_code: string | null;
  reason_text: string | null;
  created_at: string;
};

export type PipelineProspect = {
  id: string;
  business_name: string;
  city: string | null;
  category: string | null;
  phone_e164: string | null;
  email: string | null;
  source: string | null;
  data_quality_score: number | null;
  verification_status: string | null;
  outreach_status: string | null;
  rejection_reason_code: string | null;
  rejection_reason_text: string | null;
  last_action_at: string | null;
  updated_at: string;
};

const REFRESH_MS = 15_000;

export function useFunnelDaily() {
  return useQuery({
    queryKey: ["acq-funnel-daily"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_acquisition_funnel_daily")
        .select("*");
      if (error) throw error;
      return (data ?? []) as FunnelRow[];
    },
  });
}

export function useCoverage() {
  return useQuery({
    queryKey: ["acq-coverage"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_acquisition_coverage")
        .select("*");
      if (error) throw error;
      return (data ?? []) as CoverageRow[];
    },
  });
}

export function useRejectionReasons() {
  return useQuery({
    queryKey: ["acq-rejection-reasons"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_acquisition_rejection_reasons")
        .select("*")
        .limit(10);
      if (error) throw error;
      return (data ?? []) as RejectionRow[];
    },
  });
}

export function useRecentEvents(limit = 50) {
  return useQuery({
    queryKey: ["acq-recent-events", limit],
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("acquisition_pipeline_events")
        .select("id,business_name,city,category,source,stage,reason_code,reason_text,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as PipelineEvent[];
    },
  });
}

export function usePipelineProspects(filters: {
  stage?: string;
  source?: string;
  city?: string;
  category?: string;
  reason?: string;
} = {}) {
  return useQuery({
    queryKey: ["acq-pipeline-prospects", filters],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      let q = (supabase as any)
        .from("verified_contractor_prospects")
        .select(
          "id,business_name,city,category,phone_e164,email,source,data_quality_score,verification_status,outreach_status,rejection_reason_code,rejection_reason_text,last_action_at,updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(200);
      if (filters.source) q = q.eq("source", filters.source);
      if (filters.city) q = q.eq("city", filters.city);
      if (filters.category) q = q.eq("category", filters.category);
      if (filters.reason) q = q.eq("rejection_reason_code", filters.reason);
      if (filters.stage === "rejected") q = q.not("rejection_reason_code", "is", null);
      if (filters.stage === "verified") q = q.eq("verification_status", "verified");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PipelineProspect[];
    },
  });
}
