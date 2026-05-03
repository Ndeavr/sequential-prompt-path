import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLiveProspects(filters?: { status?: string; trade?: string; city?: string }) {
  return useQuery({
    queryKey: ["live-prospects", filters],
    queryFn: async () => {
      let q = supabase.from("contractor_prospects").select("*").order("priority_score", { ascending: false, nullsFirst: false }).limit(200);
      if (filters?.status) q = q.eq("qualification_status", filters.status);
      if (filters?.trade) q = q.eq("trade", filters.trade);
      if (filters?.city) q = q.eq("city", filters.city);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 15000,
  });
}

export function useLiveAgentRuns() {
  return useQuery({
    queryKey: ["live-agent-runs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("live_agent_runs").select("*").order("started_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 8000,
  });
}

export function useLiveOutreachDrafts() {
  return useQuery({
    queryKey: ["live-outreach-drafts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("live_outreach_drafts")
        .select("*, contractor_prospects(business_name, email, city, trade, aipp_score, website_url)")
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });
}

export function useLiveSettings() {
  return useQuery({
    queryKey: ["live-agent-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("live_agent_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useGoLive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { city: string; trade: string; discover_limit?: number; enrich_limit?: number; draft_limit?: number }) => {
      const { data, error } = await supabase.functions.invoke("live-agent-go-live", { body: input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-prospects"] });
      qc.invalidateQueries({ queryKey: ["live-agent-runs"] });
      qc.invalidateQueries({ queryKey: ["live-outreach-drafts"] });
    },
  });
}

export function useApproveDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft_id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("live_outreach_drafts").update({
        approved_by_admin: true,
        draft_status: "approved",
        approved_by: u.user?.id,
        approved_at: new Date().toISOString(),
      }).eq("id", draft_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["live-outreach-drafts"] }),
  });
}

export function useSendDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft_id: string) => {
      const { data, error } = await supabase.functions.invoke("live-agent-outreach-send", { body: { draft_id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["live-outreach-drafts"] }),
  });
}

export function useEnrichProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prospect_id: string) => {
      const { data, error } = await supabase.functions.invoke("live-agent-enrich", { body: { prospect_id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["live-prospects"] }),
  });
}
