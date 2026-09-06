/**
 * UNPRO — useContractorRecommendation
 * Single query for the recommendation page. Public-safe (only published contractors).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { getCompatibilityDefaults } from "../logic/compatibilityDefaults";
import { buildAIReference, type AIReferencePayload } from "../logic/aiReferenceBuilder";

export interface PublicSource { label: string; url: string }

export interface ContractorRecommendationData {
  contractor: Tables<"contractors"> & { service_areas: string[]; services_structured: string[] };
  projects: Tables<"contractor_projects">[];
  services: Pick<Tables<"contractor_services">, "service_name_fr" | "category" | "display_order" | "is_active">[];
  serviceAreas: Pick<Tables<"contractor_service_areas">, "city_name" | "is_primary">[];
  publicSources: PublicSource[];
  aiReference: AIReferencePayload;
  compatibility: { fits: string[]; not_fits: string[] };
}

const asRecord = (value: Json | null): Record<string, Json> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;

export function useContractorRecommendation(slug: string | undefined) {
  return useQuery({
    queryKey: ["contractor-recommendation", slug],
    enabled: !!slug,
    queryFn: async (): Promise<ContractorRecommendationData | null> => {
      let c: Tables<"contractors"> | null = null;

      const { data: direct } = await supabase
        .from("contractors")
        .select("*")
        .eq("slug", slug!)
        .eq("is_published", true)
        .maybeSingle();
      c = direct;

      // Fallback for published-but-unverified profiles (public read goes through the
      // security-definer RPC, which only exposes published public pages).
      if (!c) {
        const { data: rpcData } = await supabase.rpc("get_contractor_public_profile", {
          _slug: slug!,
        });
        const payload = rpcData ? asRecord(rpcData) : null;
        const candidate = payload?.contractor;
        if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
          c = candidate as Tables<"contractors">;
        }
      }

      if (!c) return null;

      const { data: projects } = await supabase
        .from("contractor_projects")
        .select("*")
        .eq("contractor_id", c.id)
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("year", { ascending: false })
        .limit(12);

      const [{ data: svcRows }, { data: areaRows }, { data: pageRow }] = await Promise.all([
        supabase
          .from("contractor_services")
          .select("service_name_fr, category, display_order, is_active")
          .eq("contractor_id", c.id)
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("contractor_service_areas")
          .select("city_name, is_primary")
          .eq("contractor_id", c.id)
          .order("is_primary", { ascending: false }),
        supabase
          .from("contractor_public_pages")
          .select("custom_sections")
          .eq("contractor_id", c.id)
          .maybeSingle(),
      ]);

      const compatibilityRecord = asRecord(c.compatibility);
      const fits = Array.isArray(compatibilityRecord?.fits) ? compatibilityRecord.fits.filter((item): item is string => typeof item === "string") : [];
      const notFits = Array.isArray(compatibilityRecord?.not_fits) ? compatibilityRecord.not_fits.filter((item): item is string => typeof item === "string") : [];
      const compatDefaults = getCompatibilityDefaults(c.specialty);
      const compatibility = {
        fits: fits.length ? fits : compatDefaults.fits,
        not_fits: notFits.length ? notFits : compatDefaults.not_fits,
      };

      const service_areas =
        c.service_areas?.filter(Boolean)?.length
          ? c.service_areas.filter(Boolean)
          : (areaRows ?? []).map((a) => a.city_name).filter((value): value is string => !!value).length
            ? (areaRows ?? []).map((a) => a.city_name).filter((value): value is string => !!value)
            : ([c.city].filter(Boolean) as string[]);

      const declaredServices = (svcRows ?? [])
        .map((s) => s.service_name_fr)
        .filter((value): value is string => !!value);
      const services_structured =
        c.services_structured?.filter(Boolean)?.length
          ? c.services_structured.filter(Boolean)
          : declaredServices;

      const customSections = asRecord(pageRow?.custom_sections ?? null);
      const rawSources = customSections?.public_sources;
      const publicSources = Array.isArray(rawSources)
        ? rawSources.flatMap((source): PublicSource[] => {
            const record = asRecord(source);
            return typeof record?.label === "string" && typeof record.url === "string"
              ? [{ label: record.label, url: record.url }]
              : [];
          })
        : [];

      const aiReference = buildAIReference({
        business_name: c.business_name,
        specialty: c.specialty,
        service_areas,
        travel_radius_km: c.travel_radius_km ?? 15,
        is_published: c.is_published,
        admin_verified: c.admin_verified,
        internal_verified_at: c.internal_verified_at,
        insurance_info: c.insurance_info,
        services_structured,
        aipp_score: c.aipp_score,
        created_at: c.created_at,
        availability_estimate: c.availability_estimate ?? "cette_semaine",
        phone: c.phone,
        email: c.email,
        website: c.website,
        compatibility,
      });

      return {
        contractor: { ...c, service_areas, services_structured },
        projects: projects ?? [],
        services: svcRows ?? [],
        serviceAreas: areaRows ?? [],
        publicSources,
        aiReference,
        compatibility,
      };
    },
  });
}
