/**
 * UNPRO — AI Ads Engine Hook
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AdCampaign, AdGroup } from "@/services/adsEngine";

const STALE = 30_000;

export const useAdCampaigns = (platform?: string) =>
  useQuery<AdCampaign[]>({
    queryKey: ["ad-campaigns", platform],
    queryFn: async () => {
      let q = supabase.from("ad_campaigns").select("*").order("created_at", { ascending: false });
      if (platform) q = q.eq("platform", platform);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as AdCampaign[];
    },
    staleTime: STALE,
  });

export const useAdGroups = (campaignId?: string) =>
  useQuery<AdGroup[]>({
    queryKey: ["ad-groups", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase.from("ad_groups").select("*").eq("campaign_id", campaignId);
      if (error) throw error;
      return (data ?? []) as unknown as AdGroup[];
    },
    enabled: !!campaignId,
    staleTime: STALE,
  });

export const useCreateCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaign: Partial<AdCampaign>) => {
      const { data, error } = await supabase.from("ad_campaigns").insert(campaign as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ad-campaigns"] });
      toast.success("Campagne créée");
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  });
};

export const useUpdateCampaignStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("ad_campaigns").update({ status, updated_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ad-campaigns"] });
      toast.success("Statut mis à jour");
    },
  });
};

export const useCampaignStats = () =>
  useQuery({
    queryKey: ["ad-campaign-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ad_campaigns").select("platform, status, spend_cents, impressions, clicks, conversions");
      if (error) throw error;
      const campaigns = data ?? [];
      const totalSpend = campaigns.reduce((s, c) => s + (c.spend_cents ?? 0), 0);
      const totalClicks = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
      const totalConversions = campaigns.reduce((s, c) => s + (c.conversions ?? 0), 0);
      const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
      return {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter((c) => c.status === "active").length,
        totalSpend,
        totalClicks,
        totalConversions,
        totalImpressions,
        avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        costPerConversion: totalConversions > 0 ? totalSpend / totalConversions : 0,
      };
    },
    staleTime: 60_000,
  });
