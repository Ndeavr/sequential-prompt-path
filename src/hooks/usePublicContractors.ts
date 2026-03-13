/**
 * UNPRO — Public Contractor Hooks
 * Query contractors and reviews using only public-safe RLS policies.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicContractorFilters {
  q?: string;
  city?: string;
  specialty?: string;
  sort?: "newest" | "aipp" | "reviews" | "default";
}

const PUBLIC_FIELDS = "id, business_name, specialty, city, province, description, verification_status, aipp_score, rating, review_count, years_experience, logo_url, created_at, phone, email, website, postal_code, license_number, portfolio_urls, address, insurance_info" as const;

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
          query = query.order("aipp_score", { ascending: false, nullsFirst: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
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
