/**
 * UNPRO — Reputation & profile content hooks (V2)
 * Reads from persistent caches. No live scraping at render time.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReputationSource {
  url: string;
  domain: string;
  title: string | null;
  snippet: string | null;
  tier: 1 | 2 | 3;
  confidence_score: number;
  approved: boolean;
  match: Record<string, boolean>;
}

export interface ReputationSnapshot {
  slug: string;
  scan_date: string;
  next_scan_date: string;
  source_count: number;
  review_count: number;
  average_rating: number | null;
  sources: ReputationSource[];
  status: "fresh" | "refreshing" | "failed";
}

export interface ProfileContent {
  slug: string;
  company_description_fr: string | null;
  company_description_en: string | null;
  services_fr: string[] | null;
  services_en: string[] | null;
  tagline_fr: string | null;
  tagline_en: string | null;
  trust_summary_fr: string | null;
  trust_summary_en: string | null;
  locked_fr: boolean;
  locked_en: boolean;
  last_ai_generation_date: string | null;
}

export const useContractorReputation = (slug: string) =>
  useQuery({
    queryKey: ["contractor-reputation", slug],
    queryFn: async (): Promise<ReputationSnapshot | null> => {
      const { data, error } = await supabase
        .from("contractor_reputation_snapshots" as never)
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as ReputationSnapshot | null;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

export const useContractorProfileContent = (slug: string) =>
  useQuery({
    queryKey: ["contractor-profile-content", slug],
    queryFn: async (): Promise<ProfileContent | null> => {
      const { data, error } = await supabase
        .from("contractor_profile_content" as never)
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as ProfileContent | null;
    },
    enabled: !!slug,
    staleTime: 60 * 60 * 1000,
  });

export const useRefreshReputation = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("reputation-refresh", {
        body: { slug },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractor-reputation", slug] });
    },
  });
};
