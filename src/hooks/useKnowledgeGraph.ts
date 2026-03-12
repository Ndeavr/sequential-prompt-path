/**
 * UNPRO — useKnowledgeGraph Hook
 * Fetches knowledge graph data for SEO pages and navigation.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useHomeProblem = (slug?: string) => {
  return useQuery({
    queryKey: ["home-problem", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_problems")
        .select("*")
        .eq("slug", slug!)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
};

export const useHomeSolution = (slug?: string) => {
  return useQuery({
    queryKey: ["home-solution", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_solutions")
        .select("*")
        .eq("slug", slug!)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
};

export const useHomeProfession = (slug?: string) => {
  return useQuery({
    queryKey: ["home-profession", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_professions")
        .select("*")
        .eq("slug", slug!)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
};

export const useProblemSolutions = (problemId?: string) => {
  return useQuery({
    queryKey: ["problem-solutions", problemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_problem_solution_edges")
        .select("*, home_solutions(*)")
        .eq("problem_id", problemId!)
        .order("relevance_score", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!problemId,
  });
};

export const useSolutionProfessions = (solutionId?: string) => {
  return useQuery({
    queryKey: ["solution-professions", solutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_solution_profession_edges")
        .select("*, home_professions(*)")
        .eq("solution_id", solutionId!)
        .order("relevance_score", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!solutionId,
  });
};

export const useProblemImages = (problemId?: string) => {
  return useQuery({
    queryKey: ["problem-images", problemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_problem_images")
        .select("*")
        .eq("problem_id", problemId!)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!problemId,
  });
};

export const useHomeProblems = (category?: string, limit = 50) => {
  return useQuery({
    queryKey: ["home-problems", category, limit],
    queryFn: async () => {
      let query = supabase
        .from("home_problems")
        .select("id, slug, name_fr, professional_category, urgency_score, difficulty_score, cost_estimate_low, cost_estimate_high")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(limit);
      if (category) query = query.eq("professional_category", category);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useHomeSolutions = (limit = 50) => {
  return useQuery({
    queryKey: ["home-solutions", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_solutions")
        .select("id, slug, name_fr, cost_estimate_low, cost_estimate_high, diy_possible")
        .eq("is_active", true)
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
};

export const useHomeProfessions = (limit = 50) => {
  return useQuery({
    queryKey: ["home-professions", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_professions")
        .select("id, slug, name_fr, license_required, typical_hourly_rate_low, typical_hourly_rate_high")
        .eq("is_active", true)
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
};

export const useProblemCityPage = (problemSlug?: string, citySlug?: string) => {
  return useQuery({
    queryKey: ["problem-city-page", problemSlug, citySlug],
    queryFn: async () => {
      // First get problem and city IDs
      const [problemRes, cityRes] = await Promise.all([
        supabase.from("home_problems").select("id").eq("slug", problemSlug!).single(),
        supabase.from("cities").select("id").eq("slug", citySlug!).single(),
      ]);
      if (problemRes.error || cityRes.error) return null;

      const { data, error } = await supabase
        .from("home_problem_city_pages")
        .select("*")
        .eq("problem_id", problemRes.data.id)
        .eq("city_id", cityRes.data.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!problemSlug && !!citySlug,
  });
};
