import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCampaignContacts(filter?: { status?: string; segment?: string }) {
  return useQuery({
    queryKey: ["campaign-contacts", filter],
    queryFn: async () => {
      let q = supabase.from("campaign_contacts").select("*").order("created_at", { ascending: false }).limit(500);
      if (filter?.status) q = q.eq("status", filter.status);
      if (filter?.segment) q = q.eq("segment", filter.segment);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });
}

export function useCampaignKpis() {
  return useQuery({
    queryKey: ["campaign-kpis"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [{ count: active }, { count: replied }, { count: optedOut }, { data: log }] = await Promise.all([
        supabase.from("campaign_contacts").select("*", { count: "exact", head: true }).in("status", ["active", "engaged"]),
        supabase.from("campaign_contacts").select("*", { count: "exact", head: true }).eq("status", "replied"),
        supabase.from("campaign_contacts").select("*", { count: "exact", head: true }).eq("opted_out", true),
        supabase.from("campaign_send_log").select("status, channel").gte("sent_at", `${today}T00:00:00`),
      ]);
      const sentToday = (log ?? []).filter((l) => l.status === "sent").length;
      const opens = (log ?? []).filter((l) => l.status === "opened").length;
      const clicks = (log ?? []).filter((l) => l.status === "clicked").length;
      return {
        active: active ?? 0,
        sentToday,
        opens,
        clicks,
        replied: replied ?? 0,
        optedOut: optedOut ?? 0,
      };
    },
    refetchInterval: 30_000,
  });
}

export function useCampaignLiveFeed(limit = 50) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["campaign-live-feed", limit],
    queryFn: async () => {
      const { data } = await supabase.from("campaign_send_log").select("*").order("sent_at", { ascending: false }).limit(limit);
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase.channel("campaign-feed").on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "campaign_send_log" },
      () => qc.invalidateQueries({ queryKey: ["campaign-live-feed"] })
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

export function useCampaignHotLeads() {
  return useQuery({
    queryKey: ["campaign-hot-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaign_hot_leads").select("*").order("replied_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLaunchCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { action: string; segment?: string; campaign_contact_id?: string }) => {
      const { data, error } = await supabase.functions.invoke("campaign-launch", { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign-contacts"] });
      qc.invalidateQueries({ queryKey: ["campaign-kpis"] });
    },
  });
}

export function useEligibleProspectsCount() {
  return useQuery({
    queryKey: ["eligible-prospects-count"],
    queryFn: async () => {
      const [allRes, segARes, segBRes, segCRes] = await Promise.all([
        supabase.from("contractor_prospects").select("*", { count: "exact", head: true }).not("phone", "is", null),
        supabase.from("contractor_prospects").select("*", { count: "exact", head: true }).not("phone", "is", null).is("email", null).is("website_url", null),
        supabase.from("contractor_prospects").select("*", { count: "exact", head: true }).not("phone", "is", null).is("email", null).not("website_url", "is", null),
        supabase.from("contractor_prospects").select("*", { count: "exact", head: true }).not("phone", "is", null).not("email", "is", null).not("website_url", "is", null),
      ]);
      return { all: allRes.count ?? 0, A: segARes.count ?? 0, B: segBRes.count ?? 0, C: segCRes.count ?? 0 };
    },
  });
}
