/**
 * Waitlist System — hooks for contractor live scores, waitlist status, and replacement logic.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContractorProfile } from "@/hooks/useContractor";

/* ── Contractor's live performance score ── */
export const useContractorLiveScore = () => {
  const { data: contractor } = useContractorProfile();

  return useQuery({
    queryKey: ["contractor-live-score", contractor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_live_scores")
        .select("*")
        .eq("contractor_id", contractor!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!contractor?.id,
  });
};

/* ── Calculate / refresh live score ── */
export const useRefreshLiveScore = () => {
  const qc = useQueryClient();
  const { data: contractor } = useContractorProfile();

  return useMutation({
    mutationFn: async () => {
      if (!contractor?.id) throw new Error("No contractor");
      const { data, error } = await supabase.rpc("calculate_contractor_live_score", {
        p_contractor_id: contractor.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractor-live-score"] });
    },
  });
};

/* ── Contractor's waitlist entries with scores ── */
export const useContractorWaitlistEntries = () => {
  const { data: contractor } = useContractorProfile();

  return useQuery({
    queryKey: ["contractor-waitlist-entries", contractor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_waitlist")
        .select("*, territories(*)")
        .eq("contractor_id", contractor!.id)
        .order("waitlist_score", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!contractor?.id,
  });
};

/* ── Waitlist position for a specific territory ── */
export const useWaitlistPosition = (territoryId?: string, contractorId?: string) => {
  return useQuery({
    queryKey: ["waitlist-position", territoryId, contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_waitlist")
        .select("id, contractor_id, waitlist_score")
        .eq("territory_id", territoryId!)
        .eq("status", "pending")
        .order("waitlist_score", { ascending: false });
      if (error) throw error;

      const position = data?.findIndex((w) => w.contractor_id === contractorId) ?? -1;
      return {
        position: position >= 0 ? position + 1 : null,
        total: data?.length ?? 0,
        entries: data,
      };
    },
    enabled: !!territoryId && !!contractorId,
  });
};

/* ── Replacement history for contractor ── */
export const useReplacementHistory = () => {
  const { data: contractor } = useContractorProfile();

  return useQuery({
    queryKey: ["replacement-history", contractor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waitlist_replacements")
        .select("*")
        .or(`removed_contractor_id.eq.${contractor!.id},activated_contractor_id.eq.${contractor!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!contractor?.id,
  });
};

/* ── Status helpers ── */
export const getStatusLabel = (status: string) => {
  const map: Record<string, { label: string; color: string }> = {
    actif: { label: "Actif", color: "bg-success text-white" },
    surveillance: { label: "Surveillance", color: "bg-warning text-white" },
    a_risque: { label: "À risque", color: "bg-destructive text-white" },
    remplace: { label: "Remplacé", color: "bg-muted text-muted-foreground" },
  };
  return map[status] ?? { label: status, color: "bg-muted text-muted-foreground" };
};

export const getWaitlistStatusLabel = (score: number) => {
  if (score >= 75) return { label: "Position élevée", color: "bg-success text-white" };
  if (score >= 50) return { label: "En attente", color: "bg-warning text-white" };
  return { label: "Priorité faible", color: "bg-muted text-muted-foreground" };
};

export const getEntryProbability = (position: number, total: number) => {
  if (position <= 1) return { label: "Très élevée", pct: 85 };
  if (position <= 3) return { label: "Élevée", pct: 60 };
  if (position <= Math.ceil(total / 2)) return { label: "Moyenne", pct: 35 };
  return { label: "Faible", pct: 15 };
};
