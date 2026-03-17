/**
 * useLikes — Hook for like/unlike functionality with optimistic updates
 */
import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type LikeEntityType = "design_image" | "project" | "contractor" | "blog_article";

export function useLikes(entityType: LikeEntityType, entityId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["likes", entityType, entityId];

  // Fetch like count + whether current user liked
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!entityId) return { count: 0, liked: false };

      const { count } = await supabase
        .from("user_likes" as any)
        .select("*", { count: "exact", head: true })
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);

      let liked = false;
      if (user?.id) {
        const { data: row } = await supabase
          .from("user_likes" as any)
          .select("id")
          .eq("user_id", user.id)
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .maybeSingle();
        liked = !!row;
      }

      return { count: count ?? 0, liked };
    },
    enabled: !!entityId,
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !entityId) throw new Error("Auth required");

      if (data?.liked) {
        await supabase
          .from("user_likes" as any)
          .delete()
          .eq("user_id", user.id)
          .eq("entity_type", entityType)
          .eq("entity_id", entityId);
      } else {
        await supabase
          .from("user_likes" as any)
          .insert({ user_id: user.id, entity_type: entityType, entity_id: entityId });
      }
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: any) => ({
        count: (old?.count ?? 0) + (old?.liked ? -1 : 1),
        liked: !old?.liked,
      }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    count: data?.count ?? 0,
    liked: data?.liked ?? false,
    toggle: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
  };
}

export function useShareTracking() {
  const { user } = useAuth();

  const trackShare = useCallback(
    async (entityType: LikeEntityType, entityId: string, method: string = "link") => {
      await supabase.from("user_shares" as any).insert({
        user_id: user?.id ?? null,
        entity_type: entityType,
        entity_id: entityId,
        share_method: method,
      });
    },
    [user]
  );

  return { trackShare };
}
