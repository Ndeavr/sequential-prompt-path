import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AgentTask {
  id: string;
  agent_name: string;
  agent_domain: string;
  task_title: string;
  task_description: string | null;
  action_plan: string[];
  impact_score: number;
  urgency: string;
  status: string;
  execution_result: Record<string, unknown> | null;
  proposed_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  executed_at: string | null;
}

interface AgentLog {
  id: string;
  task_id: string | null;
  agent_name: string;
  log_type: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AgentMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_category: string;
  snapshot_at: string;
}

interface AgentInfo {
  name: string;
  domain: string;
  label: string;
}

interface OrchestratorStatus {
  tasks: AgentTask[];
  logs: AgentLog[];
  metrics: AgentMetric[];
  agents: AgentInfo[];
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
      toast.success(`Analyse terminée: ${data.proposals?.length ?? 0} propositions générées`);
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
    onSuccess: () => {
      toast.success("Tâche approuvée");
      queryClient.invalidateQueries({ queryKey: ["agent-orchestrator-status"] });
    },
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

  return {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    runAnalysis: analyzeMutation.mutate,
    isAnalyzing: analyzeMutation.isPending,
    approveTask: approveMutation.mutate,
    rejectTask: rejectMutation.mutate,
  };
};
