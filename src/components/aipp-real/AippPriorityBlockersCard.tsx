import type { AippAuditViewModel } from "@/types/aippReal";
import { AlertTriangle } from "lucide-react";

const impactColors = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-accent/10 text-accent border-accent/20",
  low: "bg-muted text-muted-foreground border-border",
};
const impactLabels = { high: "Impact élevé", medium: "Impact moyen", low: "Impact faible" };

export default function AippPriorityBlockersCard({ model }: { model: AippAuditViewModel }) {
  if (model.blockers.length === 0) return null;

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="font-semibold">Ce qui bloque votre visibilité maintenant</h3>
      </div>
      <div className="space-y-4">
        {model.blockers.map((b, i) => (
          <div key={i} className="space-y-2 border-b border-border/50 pb-4 last:border-0 last:pb-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm">{b.title}</h4>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${impactColors[b.impact]}`}>
                {impactLabels[b.impact]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{b.body}</p>
            <p className="text-xs text-primary">→ {b.fix}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
