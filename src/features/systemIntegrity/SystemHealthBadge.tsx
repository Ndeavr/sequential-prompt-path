/**
 * SystemHealthBadge — Global score badge.
 */
import { Card } from "@/components/ui/card";
import type { SystemHealthScore } from "./useSystemIntegrity";

export function SystemHealthBadge({ score }: { score: SystemHealthScore | undefined }) {
  const v = score?.overall_score;
  const status = score?.status;
  const color =
    status === "healthy" ? "from-emerald-500/20 to-emerald-500/5 border-emerald-500/40" :
    status === "degraded" ? "from-amber-500/20 to-amber-500/5 border-amber-500/40" :
    status === "down" ? "from-red-500/20 to-red-500/5 border-red-500/40" :
    "from-muted/20 to-muted/5 border-muted";

  const textColor =
    status === "healthy" ? "text-emerald-500" :
    status === "degraded" ? "text-amber-500" :
    status === "down" ? "text-red-500" : "text-muted-foreground";

  return (
    <Card className={`bg-gradient-to-br ${color} border p-6`}>
      <div className="flex items-baseline gap-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Santé système</p>
      </div>
      <div className="flex items-baseline gap-4 mt-2">
        <span className={`text-6xl font-bold tabular-nums ${textColor}`}>
          {v == null ? "—" : Math.round(Number(v))}
        </span>
        <span className="text-2xl text-muted-foreground">/ 100</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {status === "healthy" ? "Tous les systèmes opérationnels" :
         status === "degraded" ? "Certains pipelines dégradés" :
         status === "down" ? "Interventions requises" : "En attente de données"}
      </p>
    </Card>
  );
}
