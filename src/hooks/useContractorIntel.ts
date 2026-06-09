/**
 * UNPRO — useContractorIntel
 * Fetches & caches contractor intel snapshot for the public profile page.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContractorIntelIdentity {
  company: string;
  legal: string;
  website: string;
  rbq?: string;
  neq?: string;
  phones: string[];
  email?: string;
  territory: string[];
  services: string[];
  positioning: string;
}

export interface ContractorIntelReview {
  url?: string;
  title?: string;
  description?: string;
  snippet?: string;
}

export interface ContractorIntelPayload {
  identity: ContractorIntelIdentity;
  summary: string | null;
  markdown_excerpt: string;
  links: string[];
  reviews_search: ContractorIntelReview[];
  scrape_error: string | null;
  fetched_at: string;
}

export interface ContractorIntelResult {
  identity: ContractorIntelIdentity;
  snapshot: { id?: string; payload: ContractorIntelPayload; fetched_at?: string } | null;
  cached: boolean;
}

export function useContractorIntel(slug: string, opts?: { force?: boolean }) {
  return useQuery<ContractorIntelResult>({
    queryKey: ["contractor-intel", slug, opts?.force ? "force" : "cache"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        `fetch-contractor-intel?slug=${encodeURIComponent(slug)}${opts?.force ? "&force=1" : ""}`,
        { method: "GET" },
      );
      if (error) throw error;
      return data as ContractorIntelResult;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });
}
