/**
 * UNPRO — Article Engagement Hook
 * Handles likes, shares, downloads with optimistic updates.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function getSessionId(): string {
  let sid = sessionStorage.getItem("unpro_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("unpro_session_id", sid);
  }
  return sid;
}

export function useArticleEngagement(articleId: string | undefined) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const sessionId = useMemo(() => getSessionId(), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUserId(s?.user?.id ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // ── Counts ──
  const { data: counts } = useQuery({
    queryKey: ["article-engagement-counts", articleId],
    queryFn: async () => {
      if (!articleId) return { likes: 0, shares: 0, downloads: 0 };
      const [likes, shares, downloads] = await Promise.all([
        supabase.from("article_likes").select("id", { count: "exact", head: true }).eq("article_id", articleId),
        supabase.from("article_shares").select("id", { count: "exact", head: true }).eq("article_id", articleId),
        supabase.from("article_downloads").select("id", { count: "exact", head: true }).eq("article_id", articleId),
      ]);
      return {
        likes: likes.count ?? 0,
        shares: shares.count ?? 0,
        downloads: downloads.count ?? 0,
      };
    },
    enabled: !!articleId,
  });

  // ── Is liked? ──
  const { data: isLiked } = useQuery({
    queryKey: ["article-liked", articleId, userId, sessionId],
    queryFn: async () => {
      if (!articleId) return false;
      let query = supabase.from("article_likes").select("id").eq("article_id", articleId);
      if (userId) query = query.eq("user_id", userId);
      else query = query.eq("session_id", sessionId);
      const { data } = await query.maybeSingle();
      return !!data;
    },
    enabled: !!articleId,
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["article-engagement-counts", articleId] });
    qc.invalidateQueries({ queryKey: ["article-liked", articleId] });
  }, [qc, articleId]);

  // ── Toggle like ──
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!articleId) return;
      if (isLiked) {
        if (userId) {
          await supabase.from("article_likes").delete().eq("article_id", articleId).eq("user_id", userId);
        }
      } else {
        await supabase.from("article_likes").insert({
          article_id: articleId,
          user_id: userId ?? undefined,
          session_id: userId ? undefined : sessionId,
        } as any);
      }
    },
    onSuccess: invalidate,
  });

  // ── Share ──
  const shareMutation = useMutation({
    mutationFn: async (channel: string) => {
      if (!articleId) return;
      await supabase.from("article_shares").insert({
        article_id: articleId,
        user_id: userId ?? undefined,
        session_id: userId ? undefined : sessionId,
        share_channel: channel,
      } as any);
    },
    onSuccess: invalidate,
  });

  // ── Download ──
  const downloadMutation = useMutation({
    mutationFn: async (type: string) => {
      if (!articleId) return;
      await supabase.from("article_downloads").insert({
        article_id: articleId,
        user_id: userId ?? undefined,
        session_id: userId ? undefined : sessionId,
        download_type: type,
      } as any);
    },
    onSuccess: invalidate,
  });

  return {
    counts: counts ?? { likes: 0, shares: 0, downloads: 0 },
    isLiked: isLiked ?? false,
    toggleLike: likeMutation.mutate,
    isLiking: likeMutation.isPending,
    logShare: shareMutation.mutate,
    logDownload: downloadMutation.mutate,
  };
}
