/**
 * UNPRO — useContractorBrands
 * Fetches contractor brand profiles + brand scores. Public read.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Brand, ContractorBrandProfile, BrandScore } from "../types";

export interface ContractorBrandsResult {
  brands: (ContractorBrandProfile & { brand: Brand })[];
  score: BrandScore | null;
  loading: boolean;
}

export function useContractorBrands(contractorId: string | null | undefined) {
  const enabled = !!contractorId;

  const profiles = useQuery({
    queryKey: ["contractor-brands", contractorId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_brand_profiles" as any)
        .select(
          "id, contractor_id, brand_id, confidence_score, source_type, is_primary_ecosystem, is_certified, detected_at, brand:brands(*)"
        )
        .eq("contractor_id", contractorId!)
        .order("is_primary_ecosystem", { ascending: false })
        .order("confidence_score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const score = useQuery({
    queryKey: ["contractor-brand-score", contractorId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_scores" as any)
        .select("*")
        .eq("contractor_id", contractorId!)
        .maybeSingle();
      if (error) throw error;
      return data as any as BrandScore | null;
    },
  });

  return {
    brands: (profiles.data ?? []).filter((p) => p.brand),
    score: score.data ?? null,
    loading: profiles.isLoading || score.isLoading,
  };
}
