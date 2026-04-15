import { Lightbulb } from "lucide-react";
import type { AIPPv2Recommendation } from "@/hooks/useAIPPv2Audit";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-amber-500/20 text-amber-400",
  low: "bg-green-500/20 text-green-400",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Prioritaire",
  medium: "Moyen",
  low: "Optionnel",
};

export default function ListRecommendationsAIPP({ recommendations }: { recommendations: AIPPv2Recommendation[] }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Recommandations</h3>
      </div>
      {recommendations.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune recommandation. Votre site est bien optimisé !</p>
      ) : (
        <div className="space-y-3">
          {recommendations.map((r) => (
            <div key={r.id} className="border border-border rounded-xl p-3">
              <div className="flex items-start gap-2 mb-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[r.priority] || ""}`}>
                  {PRIORITY_LABELS[r.priority] || r.priority}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">+{r.impact_score} pts</span>
              </div>
              <p className="text-sm font-medium text-foreground">{r.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
