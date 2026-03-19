import type { PropertyScore } from "@/types/property";
import { scoreLabel, scoreColor } from "@/types/property";
import { Activity } from "lucide-react";

export default function PropertyScoreCard({ score }: { score?: PropertyScore | null }) {
  const value = score?.overall_score ?? null;

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-primary" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Score Maison
        </p>
      </div>

      <div className="flex items-end gap-3 mb-4">
        <span className={`text-4xl font-bold ${scoreColor(value)}`}>
          {value != null ? Math.round(value) : "—"}
        </span>
        <span className="text-sm text-muted-foreground pb-1">/ 100</span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={`text-sm font-medium ${scoreColor(value)}`}>
          {scoreLabel(value)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(Number(value || 0), 100))}%` }}
        />
      </div>

      {score?.calculated_at && (
        <p className="mt-3 text-xs text-muted-foreground">
          Calculé le {new Date(score.calculated_at).toLocaleDateString("fr-CA")}
        </p>
      )}
    </div>
  );
}
