import type { PropertyRecommendation } from "@/types/property";
import { formatCurrency } from "@/types/property";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, Zap } from "lucide-react";

const PRIORITY_CONFIG: Record<string, { color: string; icon: typeof Zap }> = {
  urgent: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: Zap },
  high: { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: AlertTriangle },
  medium: { color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Clock },
  low: { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle },
};

export default function PropertyRecommendations({ items }: { items: PropertyRecommendation[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card p-5">
        <h3 className="text-sm font-medium text-foreground mb-2">Recommandations</h3>
        <p className="text-sm text-muted-foreground">
          Aucune recommandation pour le moment. Complétez votre dossier pour recevoir des suggestions.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Recommandations</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Priorités suggérées</p>
        </div>
        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const config = PRIORITY_CONFIG[item.priority ?? "medium"] ?? PRIORITY_CONFIG.medium;
          const Icon = config.icon;
          return (
            <div key={item.id} className="rounded-xl border border-border/30 bg-background/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color.split(" ")[1]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs text-primary font-medium">{item.category}</span>
                      <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                        {item.priority ?? "medium"}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-sm text-foreground">{item.title}</h4>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {item.recommended_timeline && (
                  <span className="rounded-md bg-muted/40 px-2 py-1 text-muted-foreground">
                    ⏱ {item.recommended_timeline}
                  </span>
                )}
                {item.recommended_profession && (
                  <span className="rounded-md bg-muted/40 px-2 py-1 text-muted-foreground">
                    👷 {item.recommended_profession}
                  </span>
                )}
                {(item.estimated_cost_min != null || item.estimated_cost_max != null) && (
                  <span className="rounded-md bg-muted/40 px-2 py-1 text-muted-foreground">
                    💰 {formatCurrency(item.estimated_cost_min)} — {formatCurrency(item.estimated_cost_max)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
