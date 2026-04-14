/**
 * UNPRO — Email Health Center Hook
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmailSystemStatus {
  status: "active" | "warning" | "critical" | "pending";
  score: number;
  total_checks: number;
  passed: number;
  failed: number;
  warnings: number;
  blocking_issues: number;
  active_alerts: number;
  checked_at: string;
}

export interface EmailCheck {
  id: string;
  check_type: string;
  check_key: string;
  status: string;
  severity: string;
  message: string | null;
  recommended_action: string | null;
  is_blocking: boolean;
  checked_at: string;
}

export interface EmailAlert {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  recommended_action: string | null;
  created_at: string;
}

export interface DomainSnapshot {
  id: string;
  domain: string;
  spf_status: string;
  dkim_status: string;
  dmarc_status: string;
  mx_status: string;
  return_path_status: string;
  overall_status: string;
  score: number;
  created_at: string;
}

export function useEmailSystemStatus() {
  return useQuery({
    queryKey: ["email-system-status"],
    queryFn: async () => {
      const { data } = await supabase.rpc("compute_email_system_status");
      return (data as unknown as EmailSystemStatus) || { status: "pending", score: 0, total_checks: 0, passed: 0, failed: 0, warnings: 0, blocking_issues: 0, active_alerts: 0, checked_at: new Date().toISOString() };
    },
  });
}

export function useEmailChecks() {
  return useQuery({
    queryKey: ["email-checks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_system_checks" as any)
        .select("*")
        .order("checked_at", { ascending: false });
      return (data || []) as unknown as EmailCheck[];
    },
  });
}

export function useEmailAlerts() {
  return useQuery({
    queryKey: ["email-alerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_configuration_alerts" as any)
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return (data || []) as unknown as EmailAlert[];
    },
  });
}

export function useDomainSnapshots() {
  return useQuery({
    queryKey: ["email-domain-snapshots"],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_domain_health_snapshots" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return (data || []) as unknown as DomainSnapshot[];
    },
  });
}

export function useEmailTestRuns() {
  return useQuery({
    queryKey: ["email-test-runs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_test_runs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return (data || []) as any[];
    },
  });
}

export function useRunEmailAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Upsert mock checks for dev environment
      const checks = [
        { check_key: "mailbox_configured", check_type: "mailbox", status: "passed", severity: "critical", message: "Boîte d'envoi configurée", is_blocking: true },
        { check_key: "provider_active", check_type: "provider", status: "passed", severity: "critical", message: "Provider email actif", is_blocking: true },
        { check_key: "spf_valid", check_type: "domain", status: "passed", severity: "high", message: "SPF valide", is_blocking: false },
        { check_key: "dkim_valid", check_type: "domain", status: "passed", severity: "high", message: "DKIM valide", is_blocking: false },
        { check_key: "dmarc_valid", check_type: "domain", status: "warning", severity: "medium", message: "DMARC policy p=none détectée", recommended_action: "Passer DMARC à p=quarantine ou p=reject", is_blocking: false },
        { check_key: "webhook_active", check_type: "webhook", status: "passed", severity: "medium", message: "Webhooks actifs", is_blocking: false },
        { check_key: "from_email_authorized", check_type: "sender", status: "passed", severity: "critical", message: "Adresse d'envoi autorisée", is_blocking: true },
        { check_key: "reply_to_set", check_type: "sender", status: "passed", severity: "low", message: "Reply-to configuré", is_blocking: false },
        { check_key: "daily_limit_known", check_type: "quota", status: "passed", severity: "medium", message: "Limite quotidienne configurée", is_blocking: false },
        { check_key: "bounce_rate_ok", check_type: "deliverability", status: "passed", severity: "high", message: "Taux de rebond sous le seuil", is_blocking: false },
      ];

      for (const c of checks) {
        await supabase.from("email_system_checks" as any).upsert(
          { ...c, checked_at: new Date().toISOString() },
          { onConflict: "check_key" }
        );
      }

      return { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-checks"] });
      qc.invalidateQueries({ queryKey: ["email-system-status"] });
      qc.invalidateQueries({ queryKey: ["email-alerts"] });
    },
  });
}
