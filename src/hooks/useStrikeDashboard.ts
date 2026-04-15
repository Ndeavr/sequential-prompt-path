import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export function useStrikeDashboard() {
  const qc = useQueryClient();

  // Active session
  const session = useQuery({
    queryKey: ["strike-session-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strike_sessions")
        .select("*")
        .in("status", ["active", "critical", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const sessionId = session.data?.id;

  // Targets
  const targets = useQuery({
    queryKey: ["strike-targets", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strike_targets")
        .select("*")
        .eq("session_id", sessionId!)
        .order("priority_score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Events (latest 100)
  const events = useQuery({
    queryKey: ["strike-events", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strike_events")
        .select("*")
        .eq("session_id", sessionId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Results
  const results = useQuery({
    queryKey: ["strike-results", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strike_results")
        .select("*")
        .eq("session_id", sessionId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Adjustments
  const adjustments = useQuery({
    queryKey: ["strike-adjustments", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strike_adjustments")
        .select("*")
        .eq("session_id", sessionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // All sessions (for history)
  const allSessions = useQuery({
    queryKey: ["strike-sessions-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strike_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription on strike_events
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`strike-events-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "strike_events" }, () => {
        qc.invalidateQueries({ queryKey: ["strike-events", sessionId] });
        qc.invalidateQueries({ queryKey: ["strike-results", sessionId] });
        qc.invalidateQueries({ queryKey: ["strike-targets", sessionId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, qc]);

  // Mutations
  const startStrike = useMutation({
    mutationFn: async (params: { target_conversions?: number; target_category?: string; target_city?: string }) => {
      const { data, error } = await supabase.functions.invoke("start-strike-session", { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strike-session-active"] });
      qc.invalidateQueries({ queryKey: ["strike-sessions-all"] });
    },
  });

  const closeStrike = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error("No active session");
      const { error } = await supabase
        .from("strike_sessions")
        .update({ status: "closed" })
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strike-session-active"] });
      qc.invalidateQueries({ queryKey: ["strike-sessions-all"] });
    },
  });

  const refreshMetrics = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error("No active session");
      const { data, error } = await supabase.functions.invoke("update-strike-metrics", { body: { session_id: sessionId } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strike-results", sessionId] });
      qc.invalidateQueries({ queryKey: ["strike-targets", sessionId] });
      qc.invalidateQueries({ queryKey: ["strike-adjustments", sessionId] });
    },
  });

  return {
    session: session.data,
    isLoading: session.isLoading,
    targets: targets.data ?? [],
    events: events.data ?? [],
    results: results.data,
    adjustments: adjustments.data ?? [],
    allSessions: allSessions.data ?? [],
    hotProspects: (targets.data ?? []).filter((t) => t.engagement_level === "hot" || t.status === "hot"),
    startStrike,
    closeStrike,
    refreshMetrics,
  };
}
