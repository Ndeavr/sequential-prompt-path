/**
 * useGrowthFeed — Hook for the transformation discovery feed, voting, and social features.
 */
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface RenovationProject {
  id: string;
  user_id: string | null;
  category: string;
  city: string | null;
  style: string | null;
  budget: string | null;
  goal: string | null;
  original_image_url: string | null;
  project_summary: string | null;
  slug: string | null;
  vote_count: number;
  like_count: number;
  view_count: number;
  share_count: number;
  created_at: string;
  concepts: RenovationConcept[];
}

export interface RenovationConcept {
  id: string;
  project_id: string;
  concept_type: string;
  image_url: string | null;
  title: string | null;
  description: string | null;
  estimated_budget_min: number | null;
  estimated_budget_max: number | null;
  vote_count: number;
  display_order: number;
}

type FeedFilter = "trending" | "recent" | "top_week" | "top_month" | "category";

export const useGrowthFeed = (filter: FeedFilter = "trending", category?: string) => {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const feedQuery = useQuery({
    queryKey: ["growth-feed", filter, category],
    queryFn: async () => {
      let query = supabase
        .from("renovation_projects")
        .select("*")
        .eq("is_public", true);

      if (category) {
        query = query.eq("category", category);
      }

      if (filter === "trending" || filter === "top_week") {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", weekAgo).order("vote_count", { ascending: false });
      } else if (filter === "top_month") {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", monthAgo).order("vote_count", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;

      // Fetch concepts for all projects
      const projectIds = (data || []).map((p: any) => p.id);
      if (projectIds.length === 0) return [];

      const { data: concepts } = await supabase
        .from("renovation_concepts")
        .select("*")
        .in("project_id", projectIds)
        .order("display_order");

      return (data || []).map((project: any) => ({
        ...project,
        concepts: (concepts || []).filter((c: any) => c.project_id === project.id),
      })) as RenovationProject[];
    },
  });

  const projectQuery = useCallback(async (projectId: string): Promise<RenovationProject | null> => {
    const { data: project } = await supabase
      .from("renovation_projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (!project) return null;

    const { data: concepts } = await supabase
      .from("renovation_concepts")
      .select("*")
      .eq("project_id", projectId)
      .order("display_order");

    return { ...project, concepts: concepts || [] } as RenovationProject;
  }, []);

  const voteMutation = useMutation({
    mutationFn: async ({ projectId, conceptId }: { projectId: string; conceptId: string }) => {
      const fingerprint = session?.user?.id || `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { error } = await supabase.from("project_votes").insert({
        project_id: projectId,
        concept_id: conceptId,
        voter_id: session?.user?.id || null,
        voter_fingerprint: fingerprint,
      });
      if (error) {
        if (error.code === "23505") throw new Error("already_voted");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["growth-feed"] });
      queryClient.invalidateQueries({ queryKey: ["project-detail"] });
      toast.success("Vote enregistré !");
    },
    onError: (err: Error) => {
      if (err.message === "already_voted") {
        toast.info("Vous avez déjà voté pour ce projet");
      }
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (projectId: string) => {
      if (!session?.user?.id) throw new Error("auth_required");
      const { error } = await supabase.from("project_likes").insert({
        project_id: projectId,
        user_id: session.user.id,
      });
      if (error && error.code === "23505") {
        // Unlike
        await supabase.from("project_likes").delete().eq("project_id", projectId).eq("user_id", session.user.id);
        return;
      }
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["growth-feed"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (projectId: string) => {
      if (!session?.user?.id) throw new Error("auth_required");
      const { error } = await supabase.from("project_saves").insert({
        project_id: projectId,
        user_id: session.user.id,
      });
      if (error && error.code === "23505") {
        await supabase.from("project_saves").delete().eq("project_id", projectId).eq("user_id", session.user.id);
        return;
      }
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projet sauvegardé !");
    },
  });

  return {
    projects: feedQuery.data || [],
    isLoading: feedQuery.isLoading,
    vote: voteMutation.mutate,
    like: likeMutation.mutate,
    save: saveMutation.mutate,
    getProject: projectQuery,
    isVoting: voteMutation.isPending,
  };
};
