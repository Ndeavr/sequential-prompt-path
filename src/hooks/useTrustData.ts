/**
 * UNPRO — useTrustData hooks
 * Data fetching hooks for trust layer tables.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useRoadmapFeatures = () =>
  useQuery({
    queryKey: ["roadmap-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_features")
        .select("*")
        .order("priority", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useGuidesContent = (category?: string) =>
  useQuery({
    queryKey: ["guides-content", category],
    queryFn: async () => {
      let query = supabase
        .from("guides_content")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (category) query = query.eq("category", category);
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCityServices = (citySlug?: string) =>
  useQuery({
    queryKey: ["city-services", citySlug],
    queryFn: async () => {
      let query = supabase
        .from("city_services")
        .select("*")
        .eq("is_active", true)
        .order("city");
      if (citySlug) query = query.eq("city_slug", citySlug);
      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useVerifiedReviews = (contractorId?: string) =>
  useQuery({
    queryKey: ["verified-reviews", contractorId],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select("*")
        .eq("verification_status", "verified")
        .order("created_at", { ascending: false });
      if (contractorId) query = query.eq("contractor_id", contractorId);
      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAIExplanations = () =>
  useQuery({
    queryKey: ["ai-explanations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_explanations")
        .select("*")
        .eq("is_active", true)
        .order("step_order");
      if (error) throw error;
      return data ?? [];
    },
  });
