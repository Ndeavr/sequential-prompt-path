/**
 * useSmsBatches — Manage First Dollar SMS batches (create, review, list).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SmsBatch {
  id: string;
  size: number;
  lead_ids: string[];
  template_distribution: Record<string, number>;
  sent_count: number;
  delivered_count: number;
  clicked_count: number;
  converted_count: number;
  status: "pending" | "sending" | "sent" | "reviewed";
  created_at: string;
  reviewed_at: string | null;
  notes: string | null;
}

export function useSmsBatches(limit = 20) {
  return useQuery<SmsBatch[]>({
    queryKey: ["sms-batches", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_batches" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as any;
    },
    refetchInterval: 15_000,
  });
}

export function useSendBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ size, force }: { size: number; force?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("first-dollar-send-batch", {
        body: { size, force: !!force },
      });
      if (error) throw error;
      if (data?.blocked) throw new Error(data.reason ?? "Batch bloqué");
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Batch envoyé — ${data?.sent ?? 0} SMS`);
      qc.invalidateQueries({ queryKey: ["sms-batches"] });
      qc.invalidateQueries({ queryKey: ["first-dollar-funnel"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur envoi batch"),
  });
}

export function useReviewBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase
        .from("sms_batches" as any)
        .update({ status: "reviewed", reviewed_at: new Date().toISOString(), notes: notes ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Batch approuvé — prochain batch débloqué");
      qc.invalidateQueries({ queryKey: ["sms-batches"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });
}
