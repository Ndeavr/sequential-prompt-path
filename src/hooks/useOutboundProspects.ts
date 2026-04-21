import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useProspectApprovalQueue(filters: {
  search: string;
  status: string;
  city: string;
}) {
  return useQuery({
    queryKey: ["prospect-approval-queue", filters],
    queryFn: async () => {
      let q = supabase
        .from("contractors_prospects")
        .select("*")
        .order("aipp_score", { ascending: false })
        .limit(200);

      if (filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.city !== "all") q = q.eq("city", filters.city);
      if (filters.search) {
        q = q.or(
          `business_name.ilike.%${filters.search}%,legal_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProspectStats() {
  return useQuery({
    queryKey: ["prospect-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractors_prospects")
        .select("status, priority_tier");
      if (error) throw error;
      const all = data ?? [];
      return {
        total: all.length,
        new: all.filter((p) => p.status === "new").length,
        approved: all.filter((p) => p.status === "approved").length,
        rejected: all.filter((p) => p.status === "rejected").length,
        tier1: all.filter((p) => p.priority_tier === "tier_1").length,
      };
    },
  });
}

export function useVisibilityScore(prospectId: string | null) {
  return useQuery({
    queryKey: ["visibility-score", prospectId],
    enabled: !!prospectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("visibility_scores")
        .select("*")
        .eq("prospect_id", prospectId!)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
}

export function useProspectActions() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const approve = useMutation({
    mutationFn: async ({
      prospectId,
      campaignId,
    }: {
      prospectId: string;
      campaignId?: string;
    }) => {
      const { error } = await supabase.rpc("approve_prospect", {
        _prospect_id: prospectId,
        _campaign_id: campaignId ?? null,
        _actor_id: session?.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prospect approuvé");
      qc.invalidateQueries({ queryKey: ["prospect-approval-queue"] });
      qc.invalidateQueries({ queryKey: ["prospect-stats"] });
    },
    onError: () => toast.error("Erreur lors de l'approbation"),
  });

  const reject = useMutation({
    mutationFn: async ({
      prospectId,
      notes,
    }: {
      prospectId: string;
      notes: string;
    }) => {
      const { error } = await supabase.rpc("reject_prospect", {
        _prospect_id: prospectId,
        _actor_id: session?.user?.id ?? null,
        _notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prospect rejeté");
      qc.invalidateQueries({ queryKey: ["prospect-approval-queue"] });
      qc.invalidateQueries({ queryKey: ["prospect-stats"] });
    },
    onError: () => toast.error("Erreur lors du rejet"),
  });

  return { approve, reject };
}

export function useSendingHealth() {
  return useQuery({
    queryKey: ["sending-health"],
    queryFn: async () => {
      const { data: mailboxes, error: mailboxesError } = await supabase
        .from("outbound_mailboxes")
        .select("id, sender_email, sender_name, provider, mailbox_status, health_score, sent_today, daily_limit, reply_to_email, tracking_domain, updated_at")
        .order("updated_at", { ascending: false });
      if (mailboxesError) throw mailboxesError;

      const { data: messages, error: messagesError } = await supabase
        .from("outbound_messages")
        .select("sending_status")
        .gte("sent_at", new Date(Date.now() - 7 * 86400000).toISOString());
      if (messagesError) throw messagesError;

      const msgs = messages ?? [];
      const boxes = mailboxes ?? [];
      const activeMailboxes = boxes.filter((m: any) => m.mailbox_status === "active").length;
      return {
        mailboxes: boxes,
        activeMailboxes,
        providerConnected: boxes.find((m: any) => m.mailbox_status === "active")?.provider ?? null,
        backendTruthSyncedAt: new Date().toISOString(),
        totalSent7d: msgs.length,
        delivered: msgs.filter((m: any) => m.sending_status === "delivered").length,
        opened: msgs.filter((m: any) => m.sending_status === "opened").length,
        replied: msgs.filter((m: any) => m.sending_status === "replied").length,
        bounced: msgs.filter((m: any) => m.sending_status === "bounced").length,
      };
    },
    staleTime: 0,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
}

export function useDailySendStats() {
  return useQuery({
    queryKey: ["daily-send-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("outbound_messages")
        .select("sent_at, sending_status")
        .gte("sent_at", new Date(Date.now() - 30 * 86400000).toISOString())
        .order("sent_at", { ascending: true });
      return data ?? [];
    },
    staleTime: 120_000,
  });
}
