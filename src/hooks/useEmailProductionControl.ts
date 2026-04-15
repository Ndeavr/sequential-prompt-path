import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useEmailDomainHealth(domain = "mail.unpro.ca") {
  return useQuery({
    queryKey: ["email-domain-health", domain],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_domain_health")
        .select("*")
        .eq("domain", domain)
        .maybeSingle();
      return data;
    },
  });
}

export function useEmailWarmupSchedule(domain = "mail.unpro.ca") {
  return useQuery({
    queryKey: ["email-warmup-schedule", domain],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_warmup_schedule")
        .select("*")
        .eq("domain", domain)
        .order("day_number");
      return data || [];
    },
  });
}

export function useEmailDeliveryLogs(limit = 50) {
  return useQuery({
    queryKey: ["email-delivery-logs", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_delivery_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    },
  });
}

export function useCheckDomainHealth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (domain = "mail.unpro.ca") => {
      const { data, error } = await supabase.functions.invoke("fn-check-email-domain-health", {
        body: { domain },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-domain-health"] });
    },
  });
}

export function useInitWarmup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (domain = "mail.unpro.ca") => {
      const { data, error } = await supabase.functions.invoke("fn-schedule-email-warmup", {
        body: { domain, action: "init" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-warmup-schedule"] });
    },
  });
}

export function useAnalyzeSpamRisk() {
  return useMutation({
    mutationFn: async (domain = "mail.unpro.ca") => {
      const { data, error } = await supabase.functions.invoke("fn-analyze-spam-risk", {
        body: { domain },
      });
      if (error) throw error;
      return data;
    },
  });
}
