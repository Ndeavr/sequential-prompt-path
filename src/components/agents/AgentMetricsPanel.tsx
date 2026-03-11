import type { AgentMetric, AgentLog, AgentMemory } from "@/hooks/useAgentOrchestrator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Brain, Database } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  metrics: AgentMetric[];
  logs: AgentLog[];
  memory: AgentMemory[];
}

const AgentMetricsPanel = ({ metrics, logs, memory }: Props) => {
  // Get latest value per metric
  const latest = metrics.reduce((acc, m) => {
    if (!acc[m.metric_name] || new Date(m.snapshot_at) > new Date(acc[m.metric_name].snapshot_at)) {
      acc[m.metric_name] = m;
    }
    return acc;
  }, {} as Record<string, AgentMetric>);

  const metricEntries = Object.entries(latest);

  return (
    <div className="space-y-4">
      {/* Metrics */}
      {metricEntries.length > 0 && (
        <Card className="glass-surface border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Métriques Système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {metricEntries.map(([key, m]) => (
                <div key={key} className="text-center p-2 rounded-lg bg-muted/20">
                  <p className="text-base font-bold text-foreground">{m.metric_value}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Memory */}
      {memory.length > 0 && (
        <Card className="glass-surface border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5 text-primary" />
              Mémoire partagée ({memory.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {memory.slice(0, 8).map(m => (
                <div key={m.id} className="flex items-start gap-2 text-[10px]">
                  <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">{m.memory_type}</Badge>
                  <span className="text-foreground flex-1">{m.content}</span>
                  <span className="text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: fr })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Log */}
      {logs.length > 0 && (
        <Card className="glass-surface border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-primary" />
              Journal ({logs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {logs.slice(0, 10).map(log => (
                <div key={log.id} className="flex items-start gap-2 text-[10px]">
                  <span className="text-muted-foreground whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
                  </span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">{log.log_type}</Badge>
                  <span className="text-foreground">{log.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgentMetricsPanel;
