import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BadgeRunState from "./BadgeRunState";
import type { PipelineLiveRun } from "@/services/pipelineCommandCenterService";

function fmtDuration(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`;
}

export default function TablePipelineExecutions({ runs }: { runs: PipelineLiveRun[] }) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Runs actifs
        </CardTitle>
        <span className="text-xs text-muted-foreground">{runs.length}</span>
      </CardHeader>
      <CardContent className="p-0">
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 px-4">Aucun run actif en ce moment</p>
        ) : (
          <div className="divide-y">
            {runs.map(r => (
              <button
                key={r.id}
                onClick={() => navigate(`/admin/outbound/runs/${r.id}`)}
                className="w-full text-left p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <BadgeRunState status={r.normalized_status} />
                      <span className="text-xs font-medium truncate">
                        {r.current_stage || "stage inconnue"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 font-mono truncate">
                      {r.id.slice(0, 8)} · {fmtDuration(r.duration_seconds)}
                      {r.open_blockers_count > 0 && (
                        <span className="text-amber-400 ml-2">⚠ {r.open_blockers_count} blocage{r.open_blockers_count > 1 ? "s" : ""}</span>
                      )}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
