/**
 * UNPRO — Concierge cockpit data hooks.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ConciergeStage =
  | "discovered"
  | "contacted"
  | "replied"
  | "interested"
  | "demo_sent"
  | "offer_sent"
  | "payment_pending"
  | "activated"
  | "rejected"
  | "followup_needed";

export const CONCIERGE_STAGES: { key: ConciergeStage; label: string }[] = [
  { key: "discovered", label: "Découvert" },
  { key: "contacted", label: "Contacté" },
  { key: "replied", label: "A répondu" },
  { key: "interested", label: "Intéressé" },
  { key: "demo_sent", label: "Démo envoyée" },
  { key: "offer_sent", label: "Offre envoyée" },
  { key: "payment_pending", label: "Paiement en attente" },
  { key: "activated", label: "Activé" },
  { key: "followup_needed", label: "Relance" },
  { key: "rejected", label: "Rejeté" },
];

export type ConciergeTarget = {
  id: string;
  business_name: string;
  owner_name: string | null;
  category_slug: string | null;
  trade: string | null;
  city: string | null;
  region: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  review_count: number | null;
  review_rating: number | null;
  aipp_score: number | null;
  outreach_status: string;
  payment_status: string;
  activation_status: string;
  concierge_owner_id: string | null;
  concierge_priority: number | null;
  concierge_stage: ConciergeStage | null;
  next_action: string | null;
  next_action_due_at: string | null;
  last_action_at: string | null;
  public_slug: string | null;
  concierge_target_score: number | null;
};

export type ConciergeTouch = {
  id: string;
  prospect_id: string;
  channel: "sms" | "email" | "call" | "voicemail" | "inperson" | "note" | "system";
  direction: "out" | "in" | "internal";
  body: string | null;
  occurred_at: string;
  created_by: string | null;
  metadata: Record<string, unknown>;
};

export function useConciergeTargets() {
  return useQuery({
    queryKey: ["concierge-targets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_concierge_targets" as any)
        .select("*")
        .order("concierge_target_score", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as ConciergeTarget[];
    },
    staleTime: 30_000,
  });
}

export function useConciergeProspect(id: string | null) {
  return useQuery({
    queryKey: ["concierge-prospect", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_prospects")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useConciergeTouches(prospectId: string | null) {
  return useQuery({
    queryKey: ["concierge-touches", prospectId],
    enabled: !!prospectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_touches" as any)
        .select("*")
        .eq("prospect_id", prospectId!)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ConciergeTouch[];
    },
  });
}

export function useLogTouch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<ConciergeTouch, "id" | "occurred_at" | "created_by" | "metadata"> & { metadata?: Record<string, unknown> }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("concierge_touches" as any)
        .insert({
          prospect_id: input.prospect_id,
          channel: input.channel,
          direction: input.direction,
          body: input.body,
          created_by: auth.user?.id ?? null,
          metadata: input.metadata ?? {},
        })
        .select()
        .single();
      if (error) throw error;
      // Update last_action_at on prospect
      await supabase
        .from("contractor_prospects")
        .update({ last_action_at: new Date().toISOString() })
        .eq("id", input.prospect_id);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["concierge-touches", vars.prospect_id] });
      qc.invalidateQueries({ queryKey: ["concierge-targets"] });
    },
  });
}

export function useUpdateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from("contractor_prospects")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["concierge-prospect", vars.id] });
      qc.invalidateQueries({ queryKey: ["concierge-targets"] });
    },
  });
}
