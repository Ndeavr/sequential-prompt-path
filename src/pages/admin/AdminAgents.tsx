import AdminLayout from "@/layouts/AdminLayout";
import { useAgentOrchestrator } from "@/hooks/useAgentOrchestrator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Bot, Brain, Play, Check, X, AlertTriangle, TrendingUp,
  Zap, Clock, Activity, ChevronRight, Loader2, Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const urgencyConfig: Record<string, { color: string; icon: typeof AlertTriangle }> = {
  critical: { color: "bg-destructive text-destructive-foreground", icon: AlertTriangle },
  high: { color: "bg-orange-500/20 text-orange-400 border border-orange-500/30", icon: Zap },
  medium: { color: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30", icon: Clock },
  low: { color: "bg-muted text-muted-foreground", icon: Activity },
};

const domainIcons: Record<string, typeof Bot> = {
  growth: TrendingUp,
  leads: Zap,
  seo: Brain,
  revenue: Shield,
  operations: Activity,
};

const AdminAgents = () => {
  const {
    status,
    isLoading,
    runAnalysis,
    isAnalyzing,
    approveTask,
    rejectTask,
  } = useAgentOrchestrator();

  const tasks = status?.tasks ?? [];
  const logs = status?.logs ?? [];
  const agents = status?.agents ?? [];
  const metrics = status?.metrics ?? [];

  const proposedTasks = tasks.filter((t) => t.status === "proposed");
  const approvedTasks = tasks.filter((t) => t.status === "approved");
  const rejectedTasks = tasks.filter((t) => t.status === "rejected");

  // Get latest metrics
  const latestMetrics = metrics.reduce((acc, m) => {
    if (!acc[m.metric_name] || new Date(m.snapshot_at) > new Date(acc[m.metric_name].snapshot_at)) {
      acc[m.metric_name] = m;
    }
    return acc;
  }, {} as Record<string, typeof metrics[0]>);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Orchestrateur Autonome
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {agents.length} agents actifs · {proposedTasks.length} propositions en attente
            </p>
          </div>
          <Button
            onClick={() => runAnalysis()}
            disabled={isAnalyzing}
            className="gap-2 rounded-xl"
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isAnalyzing ? "Analyse en cours..." : "Lancer l'analyse"}
          </Button>
        </div>

        {/* Agent Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {agents.map((agent) => {
            const Icon = domainIcons[agent.domain] ?? Bot;
            const agentTasks = tasks.filter((t) => t.agent_name === agent.name);
            const proposed = agentTasks.filter((t) => t.status === "proposed").length;
            return (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="glass-surface border-border/30">
                  <CardContent className="p-4 text-center">
                    <div className="mx-auto w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate">{agent.label}</p>
                    <p className="text-caption text-muted-foreground mt-1">
                      {proposed > 0 ? `${proposed} proposition${proposed > 1 ? "s" : ""}` : "Aucune alerte"}
                    </p>
                    <div className={`w-2 h-2 rounded-full mx-auto mt-2 ${proposed > 0 ? "bg-orange-400 animate-pulse" : "bg-green-400"}`} />
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* System Metrics */}
        {Object.keys(latestMetrics).length > 0 && (
          <Card className="glass-surface border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Métriques Système
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(latestMetrics).map(([key, metric]) => (
                  <div key={key} className="text-center">
                    <p className="text-lg font-bold text-foreground">{metric.metric_value}</p>
                    <p className="text-caption text-muted-foreground">
                      {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Proposed Tasks - Action Required */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            Propositions en attente ({proposedTasks.length})
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : proposedTasks.length === 0 ? (
            <Card className="glass-surface border-border/30">
              <CardContent className="py-12 text-center">
                <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Aucune proposition en attente. Lancez une analyse pour que les agents identifient des opportunités.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {proposedTasks.map((task, i) => {
                  const urgency = urgencyConfig[task.urgency] ?? urgencyConfig.medium;
                  const UrgencyIcon = urgency.icon;
                  const DomainIcon = domainIcons[task.agent_domain] ?? Bot;

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="glass-surface border-border/30 hover:border-primary/30 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <DomainIcon className="h-4 w-4 text-primary shrink-0" />
                                <span className="text-xs text-muted-foreground">{task.agent_name}</span>
                                <Badge className={`text-[10px] px-1.5 py-0 ${urgency.color}`}>
                                  <UrgencyIcon className="h-3 w-3 mr-1" />
                                  {task.urgency}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  Impact: {task.impact_score}
                                </Badge>
                              </div>

                              <h3 className="font-semibold text-sm text-foreground">{task.task_title}</h3>
                              {task.task_description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {task.task_description}
                                </p>
                              )}

                              {Array.isArray(task.action_plan) && task.action_plan.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {task.action_plan.map((step, j) => (
                                    <div key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                      <ChevronRight className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                                      <span>{step}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <p className="text-caption text-muted-foreground mt-2">
                                Proposé {formatDistanceToNow(new Date(task.proposed_at), { addSuffix: true, locale: fr })}
                              </p>
                            </div>

                            <div className="flex flex-col gap-2 shrink-0">
                              <Button
                                size="sm"
                                className="gap-1 rounded-lg h-8 text-xs"
                                onClick={() => approveTask(task.id)}
                              >
                                <Check className="h-3 w-3" /> Approuver
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1 rounded-lg h-8 text-xs text-muted-foreground"
                                onClick={() => rejectTask(task.id)}
                              >
                                <X className="h-3 w-3" /> Rejeter
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Approved / Rejected */}
        {(approvedTasks.length > 0 || rejectedTasks.length > 0) && (
          <>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {approvedTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" /> Approuvées ({approvedTasks.length})
                  </h3>
                  <div className="space-y-2">
                    {approvedTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                        <p className="text-xs font-medium text-foreground">{task.task_title}</p>
                        <p className="text-caption text-muted-foreground">{task.agent_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {rejectedTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <X className="h-4 w-4 text-muted-foreground" /> Rejetées ({rejectedTasks.length})
                  </h3>
                  <div className="space-y-2">
                    {rejectedTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="p-3 rounded-lg bg-muted/30 border border-border/30">
                        <p className="text-xs font-medium text-foreground line-through opacity-60">{task.task_title}</p>
                        <p className="text-caption text-muted-foreground">{task.agent_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Activity Log */}
        {logs.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Journal d'activité
              </h3>
              <div className="space-y-1.5">
                {logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">{log.log_type}</Badge>
                    <span className="text-foreground">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAgents;
