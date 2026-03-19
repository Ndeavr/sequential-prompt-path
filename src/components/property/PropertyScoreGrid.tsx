import type { PropertyScore } from "@/types/property";
import { scoreColor } from "@/types/property";

const SUBSCORE_LABELS: Record<string, string> = {
  structure: "Structure",
  insulation: "Isolation",
  roof: "Toiture",
  humidity: "Humidité",
  windows: "Fenêtres",
  heating: "Chauffage",
  electrical: "Électrique",
  plumbing: "Plomberie",
  foundation: "Fondation",
  ventilation: "Ventilation",
};

export default function PropertyScoreGrid({ score }: { score?: PropertyScore | null }) {
  const components = score?.component_scores ?? {};
  const entries = Object.entries(components).filter(([, v]) => typeof v === "number");

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card p-5 text-center">
        <p className="text-sm text-muted-foreground">
          Aucun sous-score disponible. Lancez une analyse pour obtenir un diagnostic détaillé.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-xl border border-border/30 bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">
            {SUBSCORE_LABELS[key] ?? key}
          </p>
          <p className={`text-2xl font-bold ${scoreColor(value as number)}`}>
            {Math.round(value as number)}
          </p>
        </div>
      ))}
    </div>
  );
}
