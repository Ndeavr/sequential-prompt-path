/**
 * UNPRO — Hook for the public contractor profile page.
 * Uses the get_contractor_public_profile RPC + supplementary queries.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useContractorFullProfile = (slugOrId: string | undefined) => {
  return useQuery({
    queryKey: ["contractor-full-public", slugOrId],
    queryFn: async () => {
      if (!slugOrId) return null;

      // Try RPC first (slug-based)
      const { data: rpcData } = await supabase.rpc("get_contractor_public_profile", {
        _slug: slugOrId,
      });

      if (rpcData) return rpcData as any;

      // Fallback: direct query by ID
      const { data: contractor, error } = await supabase
        .from("contractors")
        .select("*")
        .eq("id", slugOrId)
        .maybeSingle();
      if (error || !contractor) return null;

      // Build enriched object manually
      const [services, areas, media, credentials, aiProfile, publicPage, problemLinks, comparables] =
        await Promise.all([
          supabase.from("contractor_services").select("*").eq("contractor_id", contractor.id).eq("is_active", true),
          supabase.from("contractor_service_areas").select("*").eq("contractor_id", contractor.id),
          supabase.from("contractor_media").select("*").eq("contractor_id", contractor.id).eq("is_approved", true).order("display_order"),
          supabase.from("contractor_credentials").select("*").eq("contractor_id", contractor.id).eq("verification_status", "verified"),
          supabase.from("contractor_ai_profiles").select("*").eq("contractor_id", contractor.id).eq("is_current", true).maybeSingle(),
          supabase.from("contractor_public_pages").select("*").eq("contractor_id", contractor.id).maybeSingle(),
          supabase.from("contractor_problem_links").select("problem_id, relevance_score").eq("contractor_id", contractor.id),
          supabase.from("contractor_comparables").select("comparable_contractor_id, similarity_score").eq("contractor_id", contractor.id).order("similarity_score", { ascending: false }).limit(5),
        ]);

      // Fetch comparable names
      const compIds = (comparables.data ?? []).map((c: any) => c.comparable_contractor_id);
      let compDetails: any[] = [];
      if (compIds.length > 0) {
        const { data: cd } = await supabase.from("contractors").select("id, business_name, slug, specialty, city, aipp_score, rating, review_count, logo_url").in("id", compIds);
        compDetails = cd ?? [];
      }

      // Fetch problem names
      const problemIds = (problemLinks.data ?? []).map((p: any) => p.problem_id);
      let problemDetails: any[] = [];
      if (problemIds.length > 0) {
        const { data: pd } = await supabase.from("home_problems").select("id, name_fr, slug, icon_name").in("id", problemIds);
        problemDetails = pd ?? [];
      }

      return {
        contractor,
        ai_profile: aiProfile.data,
        services: services.data ?? [],
        service_areas: areas.data ?? [],
        media: media.data ?? [],
        credentials: credentials.data ?? [],
        public_page: publicPage.data,
        problem_links: (problemLinks.data ?? []).map((pl: any) => ({
          ...pl,
          problem: problemDetails.find((p: any) => p.id === pl.problem_id),
        })),
        comparables: (comparables.data ?? []).map((c: any) => ({
          ...c,
          ...compDetails.find((cd: any) => cd.id === c.comparable_contractor_id),
        })),
      };
    },
    enabled: !!slugOrId,
    staleTime: 30_000,
  });
};

export const useContractorAIPPBreakdown = (contractorId: string | undefined) => {
  return useQuery({
    queryKey: ["contractor-aipp-breakdown", contractorId],
    queryFn: async () => {
      if (!contractorId) return null;
      const { data, error } = await supabase
        .from("contractor_aipp_scores")
        .select("*")
        .eq("contractor_id", contractorId)
        .eq("is_current", true)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!contractorId,
  });
};

export const useContractorReviewDimensions = (contractorId: string | undefined) => {
  return useQuery({
    queryKey: ["contractor-review-dimensions", contractorId],
    queryFn: async () => {
      if (!contractorId) return [];
      const { data, error } = await supabase
        .from("contractor_review_dimension_scores")
        .select("*")
        .eq("contractor_id", contractorId);
      if (error) return [];
      return data ?? [];
    },
    enabled: !!contractorId,
  });
};

export const useContractorReviewAggregate = (contractorId: string | undefined) => {
  return useQuery({
    queryKey: ["contractor-review-aggregate", contractorId],
    queryFn: async () => {
      if (!contractorId) return null;
      const { data, error } = await supabase
        .from("contractor_review_aggregates")
        .select("*")
        .eq("contractor_id", contractorId)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!contractorId,
  });
};

export const useContractorPublicProjects = (contractorId: string | undefined) =>
  useQuery({
    queryKey: ["contractor-public-projects", contractorId],
    enabled: !!contractorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_projects")
        .select("id, title, city, year, description, before_url, after_url, photos")
        .eq("contractor_id", contractorId as string)
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useContractorReviewSources = (contractorId: string | undefined) =>
  useQuery({
    queryKey: ["contractor-review-sources", contractorId],
    enabled: !!contractorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_review_sources")
        .select("id, source_name, profile_url, sync_status, last_synced_at")
        .eq("contractor_id", contractorId as string);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useHomeownerContractorCompatibility = (contractorId: string | undefined) => {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ["homeowner-contractor-compatibility", user?.id, contractorId],
    enabled: !!user?.id && role === "homeowner" && !!contractorId,
    queryFn: async () => {
      const { data: evaluations, error } = await supabase
        .from("match_evaluations")
        .select("project_id, recommendation_score, ccai_score, updated_at")
        .eq("user_id", user?.id as string)
        .eq("contractor_id", contractorId as string)
        .not("project_id", "is", null)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (error) throw error;

      const projectIds = (evaluations ?? []).map((row) => row.project_id).filter((id): id is string => !!id);
      if (projectIds.length === 0) return null;

      const { data: projects, error: projectError } = await supabase
        .from("projects")
        .select("id, status, updated_at")
        .eq("user_id", user?.id as string)
        .in("id", projectIds)
        .order("updated_at", { ascending: false });
      if (projectError) throw projectError;

      const inactive = new Set(["completed", "cancelled", "closed", "archived"]);
      const activeProject = (projects ?? []).find((project) => !inactive.has(project.status.toLowerCase()));
      if (!activeProject) return null;
      const match = (evaluations ?? []).find((evaluation) => evaluation.project_id === activeProject.id);
      const score = match?.recommendation_score ?? match?.ccai_score ?? null;
      return score == null ? null : { score: Math.max(0, Math.min(100, Math.round(score))), projectId: activeProject.id };
    },
  });
};
