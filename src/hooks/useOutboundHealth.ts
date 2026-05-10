import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OutboundMailboxHealth {
  id: string;
  email: string;
  provider: string;
  status: string;
  authStatus: "pending" | "connected" | "failed";
  lastTestAt: string | null;
  lastTestLatencyMs: number | null;
  verifiedAt: string | null;
  latencyMs: number;
  dailyLimit: number;
  sentToday: number;
}

export interface OutboundHealth {
  domainConfigured: boolean;
  spfValid: boolean;
  dkimValid: boolean;
  mxValid: boolean;
  dmarcValid: boolean;
  mailboxes: OutboundMailboxHealth[];
  mailboxActive: boolean;
  provider: string | null;
  lastSync: string;
  sendingHealthy: boolean;
}

export function useOutboundHealth(opts?: { autoRun?: boolean }) {
  return useQuery({
    queryKey: ["outbound-health"],
    queryFn: async (): Promise<OutboundHealth> => {
      const { data, error } = await supabase.functions.invoke("check-outbound-health");
      if (error) throw error;
      return data as OutboundHealth;
    },
    refetchInterval: 60_000,
    enabled: opts?.autoRun !== false,
  });
}

export function useTestOutboundSend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { mailboxId: string; recipient: string }) => {
      const { data, error } = await supabase.functions.invoke("send-outbound-test-email", { body: params });
      if (error) throw error;
      return data as { ok: boolean; latency: number; error?: string; providerResponse?: any };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outbound-health"] });
      qc.invalidateQueries({ queryKey: ["sending-health"] });
    },
  });
}

export function useTriggerOutboundHealthCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-outbound-health");
      if (error) throw error;
      return data as OutboundHealth;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outbound-health"] }),
  });
}
