import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Activity } from "lucide-react";
import BadgeAgentState from "./BadgeAgentState";
import type { PipelineAgentLive } from "@/services/pipelineCommandCenterService";

function fmtSince(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}j`;
}

export default function PanelAgentExecutionMap({ agents }: { agents: PipelineAgentLive[] }) {
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" /> Agents
        </CardTitle>
        <span className="text-xs text-muted-foreground">{agents.length}</span>
      </CardHeader>
      <CardContent className="p-0">
        {agents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucun agent enregistré</p>
        ) : (
          <div className="divide-y">
            {agents.map(a => (
              <div key={a.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <BadgeAgentState status={a.health_status} />
                      <span className="text-xs font-medium truncate">{a.agent_name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
                      {a.agent_key} · {a.agent_type ?? "—"}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {a.last_run_at ? `il y a ${fmtSince(a.seconds_since_last_run)}` : "jamais exécuté"}
                      </span>
                      {a.error_streak > 0 && (
                        <span className="text-red-300">⚠ {a.error_streak} échec{a.error_streak > 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
