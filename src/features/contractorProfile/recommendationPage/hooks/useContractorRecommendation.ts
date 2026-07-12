/**
 * UNPRO — useContractorRecommendation
 * Single query for the recommendation page. Public-safe (only published contractors).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCompatibilityDefaults } from "../logic/compatibilityDefaults";
import { buildAIReference, type AIReferencePayload } from "../logic/aiReferenceBuilder";

export interface ContractorRecommendationData {
  contractor: any;
  projects: any[];
  aiReference: AIReferencePayload;
  compatibility: { fits: string[]; not_fits: string[] };
}

export function useContractorRecommendation(slug: string | undefined) {
  return useQuery({
    queryKey: ["contractor-recommendation", slug],
    enabled: !!slug,
    queryFn: async (): Promise<ContractorRecommendationData | null> => {
      const { data: c, error } = await supabase
        .from("contractors")
        .select("*")
        .eq("slug", slug!)
        .eq("is_published", true)
        .maybeSingle();

      if (error || !c) return null;

      const { data: projects } = await supabase
        .from("contractor_projects")
        .select("*")
        .eq("contractor_id", c.id)
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("year", { ascending: false })
        .limit(12);

      const compatDb = (c as any).compatibility as { fits?: string[]; not_fits?: string[] } | null;
      const compatDefaults = getCompatibilityDefaults(c.specialty);
      const compatibility = {
        fits: compatDb?.fits?.length ? compatDb.fits : compatDefaults.fits,
        not_fits: compatDb?.not_fits?.length ? compatDb.not_fits : compatDefaults.not_fits,
      };

      const service_areas =
        ((c as any).service_areas as string[] | null)?.filter(Boolean) ||
        [c.city].filter(Boolean) as string[];
      const services_structured =
        ((c as any).services_structured as string[] | null)?.filter(Boolean) || [];

      const aiReference = buildAIReference({
        business_name: c.business_name,
        specialty: c.specialty,
        service_areas,
        travel_radius_km: (c as any).travel_radius_km ?? 15,
        is_published: c.is_published,
        admin_verified: c.admin_verified,
        internal_verified_at: c.internal_verified_at,
        insurance_info: c.insurance_info,
        services_structured,
        aipp_score: c.aipp_score,
        created_at: c.created_at,
        availability_estimate: (c as any).availability_estimate ?? "cette_semaine",
        phone: c.phone,
        email: c.email,
        website: c.website,
        compatibility,
      });

      return {
        contractor: { ...c, service_areas, services_structured },
        projects: projects ?? [],
        aiReference,
        compatibility,
      };
    },
  });
}
