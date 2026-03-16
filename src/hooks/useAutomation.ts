/**
 * UNPRO — Automation Engine Hook
 * TanStack Query bindings for the automation dashboard.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchAgents, fetchJobs, fetchRuns, fetchAlerts, fetchStats, fetchSettings,
  toggleAgent, triggerManualRun, updateJobStatus, markAlertRead, updateAgentConfig,
  type AutomationAgent, type AutomationJob, type AutomationRun, type AutomationAlert,
  type AutomationStats, type AutomationSetting, type JobStatus,
} from "@/services/automationService";

const STALE = 15_000;

export const useAutomationAgents = () =>
  useQuery<AutomationAgent[]>({ queryKey: ["automation-agents"], queryFn: fetchAgents, staleTime: STALE });

export const useAutomationJobs = (statusFilter?: string) =>
  useQuery<AutomationJob[]>({ queryKey: ["automation-jobs", statusFilter], queryFn: () => fetchJobs(200, statusFilter), staleTime: STALE });

export const useAutomationRuns = () =>
  useQuery<AutomationRun[]>({ queryKey: ["automation-runs"], queryFn: fetchRuns, staleTime: STALE });

export const useAutomationAlerts = () =>
  useQuery<AutomationAlert[]>({ queryKey: ["automation-alerts"], queryFn: fetchAlerts, staleTime: STALE });

export const useAutomationStats = () =>
  useQuery<AutomationStats>({ queryKey: ["automation-stats"], queryFn: fetchStats, staleTime: STALE });

export const useAutomationSettings = () =>
  useQuery<AutomationSetting[]>({ queryKey: ["automation-settings"], queryFn: fetchSettings, staleTime: 60_000 });

// Mutations
export const useToggleAgent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => toggleAgent(id, enabled),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation-agents"] }); qc.invalidateQueries({ queryKey: ["automation-stats"] }); toast.success("Agent mis à jour"); },
  });
};

export const useRunAgent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) => triggerManualRun(agentId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation-runs"] }); qc.invalidateQueries({ queryKey: ["automation-agents"] }); toast.success("Run lancé"); },
    onError: () => toast.error("Erreur au lancement"),
  });
};

export const useUpdateJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, extras }: { id: string; status: JobStatus; extras?: Record<string, unknown> }) => updateJobStatus(id, status, extras),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation-jobs"] }); qc.invalidateQueries({ queryKey: ["automation-stats"] }); },
  });
};

export const useMarkAlertRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAlertRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-alerts"] }),
  });
};

export const useUpdateAgentConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AutomationAgent> }) => updateAgentConfig(id, updates),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation-agents"] }); toast.success("Configuration sauvegardée"); },
  });
};
