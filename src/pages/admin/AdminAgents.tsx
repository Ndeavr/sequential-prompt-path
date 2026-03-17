import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { useAgentOrchestrator } from "@/hooks/useAgentOrchestrator";
import AgentHierarchyTree from "@/components/agents/AgentHierarchyTree";
import AgentTaskQueue from "@/components/agents/AgentTaskQueue";
import AgentMetricsPanel from "@/components/agents/AgentMetricsPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Play, Loader2, Network, ListTodo, BarChart3, Zap } from "lucide-react";

const AdminAgents = () => {
  const {
    status, isLoading, runAnalysis, isAnalyzing,
    approveTask, rejectTask, toggleAgent,
    executeTask, isExecuting,
  } = useAgentOrchestrator();
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);

  const agents = status?.agents ?? [];
  const tasks = status?.tasks ?? [];
  const logs = status?.logs ?? [];
  const metrics = status?.metrics ?? [];
  const memory = status?.memory ?? [];

  const activeAgents = agents.filter(a => a.status === "active").length;
  const proposedTasks = tasks.filter(t => t.status === "proposed").length;

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Réseau Autonome
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeAgents} agents actifs · {proposedTasks} propositions · 4 couches
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => runAnalysis()}
              disabled={isAnalyzing || isExecuting}
              className="gap-2 rounded-xl text-sm"
              size="sm"
            >
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isAnalyzing ? "Analyse..." : "Analyser"}
            </Button>
            <Button
              onClick={() => executeTask(undefined)}
              disabled={isExecuting || isAnalyzing}
              variant="outline"
              className="gap-2 rounded-xl text-sm"
              size="sm"
            >
              {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {isExecuting ? "Exécution..." : "Exécuter"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="hierarchy" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-9 rounded-xl">
            <TabsTrigger value="hierarchy" className="text-xs gap-1.5 rounded-lg">
              <Network className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Hiérarchie</span>
              <span className="sm:hidden">Agents</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs gap-1.5 rounded-lg">
              <ListTodo className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tâches</span>
              <span className="sm:hidden">Tasks</span>
              {proposedTasks > 0 && (
                <span className="ml-1 bg-orange-500 text-white text-[9px] px-1.5 py-0 rounded-full">
                  {proposedTasks}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs gap-1.5 rounded-lg">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Métriques</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hierarchy" className="mt-4">
            <AgentHierarchyTree
              agents={agents}
              onToggle={toggleAgent}
              selectedLayer={selectedLayer}
              onSelectLayer={setSelectedLayer}
            />
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <AgentTaskQueue
              tasks={tasks}
              isLoading={isLoading}
              onApprove={approveTask}
              onReject={rejectTask}
              onExecute={executeTask}
            />
          </TabsContent>

          <TabsContent value="metrics" className="mt-4">
            <AgentMetricsPanel
              metrics={metrics}
              logs={logs}
              memory={memory}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminAgents;
