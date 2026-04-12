import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export function useEmailDomainConfigs() {
  return useQuery({
    queryKey: ["email-domain-configs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_domain_configs")
        .select("*")
        .order("updated_at", { ascending: false });
      return data || [];
    },
  });
}

export function useEmailHealthReport(domainConfigId: string | undefined) {
  return useQuery({
    queryKey: ["email-health-report", domainConfigId],
    enabled: !!domainConfigId,
    queryFn: async () => {
      const { data } = await supabase
        .from("email_health_reports")
        .select("*")
        .eq("domain_config_id", domainConfigId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
}

export function useEmailAuthCheck(domainConfigId: string | undefined) {
  return useQuery({
    queryKey: ["email-auth-check", domainConfigId],
    enabled: !!domainConfigId,
    queryFn: async () => {
      const { data } = await supabase
        .from("email_authentication_checks")
        .select("*")
        .eq("domain_config_id", domainConfigId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
}

export function useEmailFixRecommendations(domainConfigId: string | undefined) {
  return useQuery({
    queryKey: ["email-fix-recs", domainConfigId],
    enabled: !!domainConfigId,
    queryFn: async () => {
      const { data } = await supabase
        .from("email_fix_recommendations")
        .select("*")
        .eq("domain_config_id", domainConfigId!)
        .eq("is_resolved", false)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });
}

export function useRunEmailAudit() {
  const queryClient = useQueryClient();
  const [auditResult, setAuditResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async (params: { domain: string; from_email?: string; reply_to?: string; provider?: string }) => {
      const { data, error } = await supabase.functions.invoke("edge-check-email-health", { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setAuditResult(data);
      queryClient.invalidateQueries({ queryKey: ["email-domain-configs"] });
      queryClient.invalidateQueries({ queryKey: ["email-health-report"] });
      queryClient.invalidateQueries({ queryKey: ["email-auth-check"] });
      queryClient.invalidateQueries({ queryKey: ["email-fix-recs"] });
    },
  });

  return { ...mutation, auditResult };
}
