import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useEmailSequences() {
  return useQuery({
    queryKey: ["email-sequences"],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_sequences")
        .select("*, email_sequence_steps(*)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });
}

export function useSendingDomains() {
  return useQuery({
    queryKey: ["sending-domains"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sending_domains")
        .select("*")
        .order("domain");
      return data || [];
    },
  });
}

export function useSendingMailboxes() {
  return useQuery({
    queryKey: ["sending-mailboxes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sending_mailboxes")
        .select("*, sending_domains(domain)")
        .order("email_address");
      return data || [];
    },
  });
}

export function useDeliverabilityScores() {
  return useQuery({
    queryKey: ["deliverability-scores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deliverability_scores")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });
}

export function useEmailPersonalizations(limit = 20) {
  return useQuery({
    queryKey: ["email-personalizations", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_personalizations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    },
  });
}

export function useRevenueLossEstimations(limit = 20) {
  return useQuery({
    queryKey: ["revenue-loss-estimations", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("revenue_loss_estimations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    },
  });
}

export function useUnopenedEmailFlags() {
  return useQuery({
    queryKey: ["unopened-email-flags"],
    queryFn: async () => {
      const { data } = await supabase
        .from("unopened_email_flags")
        .select("*")
        .eq("flagged_for_sms", true)
        .eq("sms_sent", false)
        .order("updated_at", { ascending: false });
      return data || [];
    },
  });
}

export function useSmsMessages(limit = 30) {
  return useQuery({
    queryKey: ["sms-messages", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("sms_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    },
  });
}

export function useWarmupLogs(mailboxId?: string) {
  return useQuery({
    queryKey: ["warmup-logs", mailboxId],
    enabled: !!mailboxId,
    queryFn: async () => {
      const { data } = await supabase
        .from("email_warmup_logs")
        .select("*")
        .eq("mailbox_id", mailboxId!)
        .order("log_date", { ascending: false })
        .limit(30);
      return data || [];
    },
  });
}
