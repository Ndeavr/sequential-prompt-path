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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export async function fetchContractorIntel(
  slug: string,
  opts?: { force?: boolean },
): Promise<ContractorIntelResult> {
  const url = `${SUPABASE_URL}/functions/v1/fetch-contractor-intel?slug=${encodeURIComponent(slug)}${opts?.force ? "&force=1" : ""}`;
  const r = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  if (!r.ok) throw new Error(`intel_fetch_failed_${r.status}`);
  return (await r.json()) as ContractorIntelResult;
}

export function useContractorIntel(slug: string, opts?: { force?: boolean }) {
  return useQuery<ContractorIntelResult>({
    queryKey: ["contractor-intel", slug, opts?.force ? "force" : "cache"],
    queryFn: () => fetchContractorIntel(slug, opts),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });
}
