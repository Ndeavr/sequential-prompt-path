import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SystemCheck {
  id: string;
  check_key: string;
  label: string;
  category: string;
  status: "healthy" | "warning" | "critical" | "unknown";
  affected_count: number;
  last_checked_at: string | null;
  last_auto_fix_at: string | null;
  recommended_action: string | null;
  repair_route: string | null;
  metadata: Record<string, unknown>;
}

export interface RepairJob {
  id: string;
  job_type: string;
  status: string;
  risk_level: "safe" | "review" | "danger";
  affected_count: number;
  sample_diff: unknown[];
  summary: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  applied_at: string | null;
}

export function useSystemChecks() {
  return useQuery<SystemCheck[]>({
    queryKey: ["admin-system-checks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_system_checks" as any)
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any;
    },
    refetchInterval: 30_000,
  });
}

export function useRepairJobs(limit = 25) {
  return useQuery<RepairJob[]>({
    queryKey: ["admin-repair-jobs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_repair_jobs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as any;
    },
    refetchInterval: 30_000,
  });
}

export function useRunHealthCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-ops-health-check", {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Health check exécuté — ${data?.checks ?? 0} contrôles`);
      qc.invalidateQueries({ queryKey: ["admin-system-checks"] });
      qc.invalidateQueries({ queryKey: ["admin-repair-jobs"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur health check"),
  });
}

export function useInvokeFunction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, body }: { name: string; body?: any }) => {
      const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      toast.success(`${vars.name} exécuté`);
      qc.invalidateQueries({ queryKey: ["admin-system-checks"] });
      qc.invalidateQueries({ queryKey: ["admin-repair-jobs"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur exécution"),
  });
}
