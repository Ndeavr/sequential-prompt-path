import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SystemEnvironmentState {
  id: string;
  mode: "test" | "live";
  activated_at: string | null;
  activated_by: string | null;
  kill_switch_active: boolean;
  paused_at: string | null;
  paused_by: string | null;
  live_requires_approval: boolean;
  notes: string | null;
  updated_at: string;
}

export function useSystemEnvironment() {
  return useQuery({
    queryKey: ["system-environment-state"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_environment_state" as any)
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SystemEnvironmentState | null;
    },
    refetchInterval: 15000,
  });
}

export function useToggleSystemMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { mode: "test" | "live"; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke("fn-toggle-system-mode", {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.reason || data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-environment-state"] });
    },
  });
}

export function useKillSwitch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { action: "pause" | "release"; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke("fn-kill-switch-pause", {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-environment-state"] });
      qc.invalidateQueries({ queryKey: ["automation-schedules"] });
      qc.invalidateQueries({ queryKey: ["automation-jobs-ops"] });
    },
  });
}
