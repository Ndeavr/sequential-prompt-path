import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, ListTodo, History, AlertTriangle, Zap, Loader2 } from "lucide-react";
import AutomationStatsCards from "@/components/automation/AutomationStatsCards";
import AutomationAgentTable from "@/components/automation/AutomationAgentTable";
import AutomationJobQueue from "@/components/automation/AutomationJobQueue";
import AutomationRunHistory from "@/components/automation/AutomationRunHistory";
import AutomationAlertsList from "@/components/automation/AutomationAlertsList";
import AdaptiveFrequencyPanel from "@/components/automation/AdaptiveFrequencyPanel";
import {
  useAutomationAgents, useAutomationJobs, useAutomationRuns,
  useAutomationAlerts, useAutomationStats, useToggleAgent,
  useRunAgent, useUpdateJob, useMarkAlertRead,
} from "@/hooks/useAutomation";

const AdminAutomation = () => {
  const [jobFilter, setJobFilter] = useState("all");

  const { data: agents = [], isLoading: loadingAgents } = useAutomationAgents();
  const { data: jobs = [] } = useAutomationJobs(jobFilter);
  const { data: runs = [] } = useAutomationRuns();
  const { data: alerts = [] } = useAutomationAlerts();
  const { data: stats } = useAutomationStats();

  const toggleMutation = useToggleAgent();
  const runMutation = useRunAgent();
  const jobMutation = useUpdateJob();
  const alertMutation = useMarkAlertRead();

  const unreadAlerts = alerts.filter(a => !a.is_read).length;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Moteur d'automatisation
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Orchestration SEO multi-agents · Scheduler · File d'attente · Alertes
          </p>
        </div>

        <AutomationStatsCards stats={stats} />

        <Tabs defaultValue="agents" className="w-full">
          <TabsList className="w-full grid grid-cols-5 h-9 rounded-xl">
            <TabsTrigger value="agents" className="text-xs gap-1 rounded-lg">
              <Bot className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Agents</span>
            </TabsTrigger>
            <TabsTrigger value="queue" className="text-xs gap-1 rounded-lg">
              <ListTodo className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">File</span>
              {(stats?.queuedJobs ?? 0) > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-[9px] px-1.5 rounded-full">{stats?.queuedJobs}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="runs" className="text-xs gap-1 rounded-lg">
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Runs</span>
            </TabsTrigger>
            <TabsTrigger value="adaptive" className="text-xs gap-1 rounded-lg">
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Adaptatif</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs gap-1 rounded-lg">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Alertes</span>
              {unreadAlerts > 0 && (
                <span className="ml-1 bg-destructive text-white text-[9px] px-1.5 rounded-full">{unreadAlerts}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="mt-4">
            {loadingAgents ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <AutomationAgentTable
                agents={agents}
                onToggle={(id, v) => toggleMutation.mutate({ id, enabled: v })}
                onRun={id => runMutation.mutate(id)}
                isRunning={runMutation.isPending}
              />
            )}
          </TabsContent>

          <TabsContent value="queue" className="mt-4">
            <AutomationJobQueue
              jobs={jobs}
              statusFilter={jobFilter}
              onFilterChange={setJobFilter}
              onApprove={id => jobMutation.mutate({ id, status: "queued" })}
              onReject={id => jobMutation.mutate({ id, status: "cancelled" })}
            />
          </TabsContent>

          <TabsContent value="runs" className="mt-4">
            <AutomationRunHistory runs={runs} />
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <AutomationAlertsList alerts={alerts} onMarkRead={id => alertMutation.mutate(id)} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminAutomation;
