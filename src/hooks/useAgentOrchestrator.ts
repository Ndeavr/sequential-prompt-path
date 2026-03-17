import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AgentRegistryEntry {
  id: string;
  agent_key: string;
  agent_name: string;
  layer: "chief" | "executive" | "operational" | "micro";
  domain: string;
  parent_agent_key: string | null;
  mission: string | null;
  actions: string[];
  triggers: string[];
  inputs: string[];
  outputs: string[];
  tools: string[];
  success_metrics: string[];
  config: Record<string, unknown>;
  autonomy_level: "propose" | "semi_auto" | "full_auto";
  status: "active" | "paused" | "archived" | "creating";
  tasks_executed: number;
  tasks_succeeded: number;
  success_rate: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AgentTask {
  id: string;
  agent_name: string;
  agent_domain: string;
  agent_key: string | null;
  task_title: string;
  task_description: string | null;
  action_plan: string[];
  impact_score: number;
  urgency: string;
  status: string;
  auto_executable: boolean;
  execution_mode: string;
  execution_result: Record<string, unknown> | null;
  proposed_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  executed_at: string | null;
}

export interface AgentLog {
  id: string;
  task_id: string | null;
  agent_name: string;
  log_type: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AgentMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_category: string;
  snapshot_at: string;
}

export interface AgentMemory {
  id: string;
  memory_key: string;
  memory_type: string;
  domain: string;
  content: string;
  metadata: Record<string, unknown>;
  importance: number;
  agent_key: string | null;
  created_at: string;
}

export interface OrchestratorStatus {
  tasks: AgentTask[];
  logs: AgentLog[];
  metrics: AgentMetric[];
  agents: AgentRegistryEntry[];
  memory: AgentMemory[];
}

export const useAgentOrchestrator = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const statusQuery = useQuery<OrchestratorStatus>({
    queryKey: ["agent-orchestrator-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: { action: "status" },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: { action: "analyze" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Analyse terminée: ${data.proposals?.length ?? 0} propositions, ${data.stored ?? 0} nouvelles`);
      queryClient.invalidateQueries({ queryKey: ["agent-orchestrator-status"] });
    },
    onError: () => toast.error("Erreur lors de l'analyse"),
  });

  const approveMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: { action: "approve", task_id: taskId, reviewer_id: user?.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.executed) {
        toast.success(`Approuvée et exécutée: ${data.execution?.summary ?? "OK"}`);
      } else {
        toast.success("Tâche approuvée");
      }
      queryClient.invalidateQueries({ queryKey: ["agent-orchestrator-status"] });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (taskId?: string) => {
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: { action: "execute", ...(taskId ? { task_id: taskId } : {}) },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.result) {
        toast.success(data.result.summary);
      } else {
        toast.success(`Exécution: ${data.succeeded ?? 0} réussies, ${data.failed ?? 0} échouées`);
      }
      queryClient.invalidateQueries({ queryKey: ["agent-orchestrator-status"] });
    },
    onError: () => toast.error("Erreur lors de l'exécution"),
  });

  const rejectMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: { action: "reject", task_id: taskId, reviewer_id: user?.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.info("Tâche rejetée");
      queryClient.invalidateQueries({ queryKey: ["agent-orchestrator-status"] });
    },
  });

  const toggleAgentMutation = useMutation({
    mutationFn: async ({ agentKey, newStatus }: { agentKey: string; newStatus: string }) => {
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: { action: "toggle_agent", agent_key: agentKey, new_status: newStatus },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Statut agent mis à jour");
      queryClient.invalidateQueries({ queryKey: ["agent-orchestrator-status"] });
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: async (agentData: Record<string, string>) => {
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: { action: "create_agent", ...agentData },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Nouvel agent créé");
      queryClient.invalidateQueries({ queryKey: ["agent-orchestrator-status"] });
    },
  });

  return {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    runAnalysis: analyzeMutation.mutate,
    isAnalyzing: analyzeMutation.isPending,
    approveTask: approveMutation.mutate,
    rejectTask: rejectMutation.mutate,
    executeTask: executeMutation.mutate,
    isExecuting: executeMutation.isPending,
    toggleAgent: toggleAgentMutation.mutate,
    createAgent: createAgentMutation.mutate,
  };
};
