import { Card, CardContent } from "@/components/ui/card";
import BadgeRunState from "./BadgeRunState";
import type { PipelineRunDetail } from "@/services/pipelineCommandCenterService";

function fmtDuration(s: number) {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

export default function PanelRunSummary({ detail }: { detail: PipelineRunDetail }) {
  const r = detail.run;
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <BadgeRunState status={r.normalized_status} />
          <span className="text-xs text-muted-foreground font-mono">{r.id?.slice(0, 8)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Stage actuelle</p>
            <p className="font-medium">{r.current_stage ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Durée</p>
            <p className="font-medium">{fmtDuration(r.duration_seconds)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Démarré</p>
            <p className="font-medium">{r.started_at ? new Date(r.started_at).toLocaleString("fr-CA") : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Terminé</p>
            <p className="font-medium">{r.finished_at ? new Date(r.finished_at).toLocaleString("fr-CA") : "—"}</p>
          </div>
          {r.priority_score != null && (
            <div>
              <p className="text-muted-foreground">Priorité</p>
              <p className="font-medium">{Number(r.priority_score).toFixed(2)}</p>
            </div>
          )}
          {r.campaign_id && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Campaign</p>
              <p className="font-mono text-[11px] truncate">{r.campaign_id}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
