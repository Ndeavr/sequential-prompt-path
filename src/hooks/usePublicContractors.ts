/**
 * UNPRO — Public Contractor Hooks
 * Query contractors and reviews using only public-safe RLS policies.
 * Trust signals inform ranking but never monopolize it.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeTrustBoost } from "@/lib/trustLabels";

export interface PublicContractorFilters {
  q?: string;
  city?: string;
  specialty?: string;
  sort?: "newest" | "aipp" | "reviews" | "trust" | "default";
}

const PUBLIC_FIELDS = "id, business_name, specialty, city, province, description, verification_status, admin_verified, aipp_score, rating, review_count, years_experience, logo_url, created_at, phone, email, website, postal_code, license_number, portfolio_urls, address, insurance_info" as const;

export const usePublicContractorSearch = (filters: PublicContractorFilters) => {
  return useQuery({
    queryKey: ["public-contractors", filters],
    queryFn: async () => {
      let query = supabase
        .from("contractors")
        .select(PUBLIC_FIELDS)
        .eq("verification_status", "verified");

      if (filters.q) {
        query = query.ilike("business_name", `%${filters.q}%`);
      }
      if (filters.city) {
        query = query.ilike("city", `%${filters.city}%`);
      }
      if (filters.specialty) {
        query = query.ilike("specialty", `%${filters.specialty}%`);
      }

      // DB-level sort for explicit sort modes
      switch (filters.sort) {
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        case "aipp":
          query = query.order("aipp_score", { ascending: false, nullsFirst: false });
          break;
        case "reviews":
          query = query.order("review_count", { ascending: false, nullsFirst: false });
          break;
        default:
          // Default & trust: fetch by aipp then re-rank client-side with trust boost
          query = query.order("aipp_score", { ascending: false, nullsFirst: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      const results = data ?? [];

      // Client-side trust-boosted ranking for default/trust sort
      if (!filters.sort || filters.sort === "default" || filters.sort === "trust") {
        return results.sort((a, b) => {
          const boostA = computeTrustBoost(a) + (a.aipp_score ?? 0) * 0.1;
          const boostB = computeTrustBoost(b) + (b.aipp_score ?? 0) * 0.1;
          return boostB - boostA;
        });
      }

      return results;
    },
  });
};

export const usePublicContractorProfile = (id: string | undefined) => {
  return useQuery({
    queryKey: ["public-contractor", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractors")
        .select(PUBLIC_FIELDS)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

export const usePublicContractorReviews = (contractorId: string | undefined) => {
  return useQuery({
    queryKey: ["public-contractor-reviews", contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, title, content, rating, created_at")
        .eq("contractor_id", contractorId!)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contractorId,
  });
};

/** Extract unique cities and specialties for filter options */
export const usePublicFilterOptions = () => {
  return useQuery({
    queryKey: ["public-filter-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractors")
        .select("city, specialty")
        .eq("verification_status", "verified");
      if (error) throw error;

      const cities = [...new Set((data ?? []).map((c) => c.city).filter(Boolean))] as string[];
      const specialties = [...new Set((data ?? []).map((c) => c.specialty).filter(Boolean))] as string[];
      return { cities: cities.sort(), specialties: specialties.sort() };
    },
    staleTime: 60_000,
  });
};
