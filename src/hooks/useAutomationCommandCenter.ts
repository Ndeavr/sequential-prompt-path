/**
 * UNPRO — Automation Command Center Hook
 * TanStack Query bindings for the command center dashboard.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchBlockers, fetchWorkflows, fetchAutomationRules, fetchActionLogs,
  fetchDashboardMetrics, resolveBlocker, detectBlockers, toggleWorkflow, toggleRule,
  type AutomationBlocker, type AutomationWorkflow, type AutomationRule,
  type AutomationActionLog, type DashboardMetrics,
} from "@/services/automationCommandCenterService";

const STALE = 15_000;

export const useCommandCenterMetrics = () =>
  useQuery<DashboardMetrics>({ queryKey: ["cmd-center-metrics"], queryFn: fetchDashboardMetrics, staleTime: STALE, refetchInterval: 30_000 });

export const useBlockers = (statusFilter = "open") =>
  useQuery<AutomationBlocker[]>({ queryKey: ["cmd-center-blockers", statusFilter], queryFn: () => fetchBlockers(statusFilter), staleTime: STALE });

export const useWorkflows = () =>
  useQuery<AutomationWorkflow[]>({ queryKey: ["cmd-center-workflows"], queryFn: fetchWorkflows, staleTime: 60_000 });

export const useAutomationRulesCmd = () =>
  useQuery<AutomationRule[]>({ queryKey: ["cmd-center-rules"], queryFn: fetchAutomationRules, staleTime: 60_000 });

export const useActionLogs = () =>
  useQuery<AutomationActionLog[]>({ queryKey: ["cmd-center-action-logs"], queryFn: () => fetchActionLogs(100), staleTime: STALE, refetchInterval: 20_000 });

export const useResolveBlocker = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "retry" | "ignore" | "resolve" }) => resolveBlocker(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cmd-center-blockers"] });
      qc.invalidateQueries({ queryKey: ["cmd-center-metrics"] });
      toast.success("Blocage résolu");
    },
    onError: () => toast.error("Erreur résolution blocage"),
  });
};

export const useDetectBlockers = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: detectBlockers,
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["cmd-center-blockers"] });
      toast.success(`${data?.detected ?? 0} blocages détectés`);
    },
  });
};

export const useToggleWorkflow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => toggleWorkflow(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cmd-center-workflows"] });
      toast.success("Workflow mis à jour");
    },
  });
};

export const useToggleRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => toggleRule(id, enabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cmd-center-rules"] });
      toast.success("Règle mise à jour");
    },
  });
};
