import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRecruitmentCampaigns() {
  const qc = useQueryClient();

  const campaigns = useQuery({
    queryKey: ["recruitment-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_recruitment_campaigns")
        .select("*, recruitment_clusters(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const sequences = useQuery({
    queryKey: ["recruitment-sequences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_recruitment_sequences")
        .select("*, contractor_recruitment_campaigns(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const messages = useQuery({
    queryKey: ["recruitment-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_recruitment_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const launchCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase
        .from("contractor_recruitment_campaigns")
        .update({ status: "active", started_at: new Date().toISOString() })
        .eq("id", campaignId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recruitment-campaigns"] }),
  });

  const pauseCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase
        .from("contractor_recruitment_campaigns")
        .update({ status: "paused", paused_at: new Date().toISOString() })
        .eq("id", campaignId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recruitment-campaigns"] }),
  });

  return { campaigns, sequences, messages, launchCampaign, pauseCampaign };
}
