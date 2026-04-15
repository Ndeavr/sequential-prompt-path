import { Brain, CheckCircle2, XCircle } from "lucide-react";

interface Props {
  score: number;
}

const CHECKS = [
  { label: "Section FAQ structurée", threshold: 40 },
  { label: "Réponses directes aux questions", threshold: 30 },
  { label: "Structure problème → solution", threshold: 50 },
  { label: "Densité sémantique suffisante", threshold: 35 },
  { label: "Contenu optimisé pour citations IA", threshold: 60 },
];

export default function PanelAEOReadiness({ score }: Props) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">AEO — Visibilité IA</h3>
        <span className="ml-auto text-lg font-bold text-foreground">{score}/100</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Capacité de votre site à apparaître dans les réponses de ChatGPT, Perplexity et Google AI.
      </p>
      <div className="space-y-2">
        {CHECKS.map((c) => {
          const pass = score >= c.threshold;
          return (
            <div key={c.label} className="flex items-center gap-2 text-xs">
              {pass ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span className={pass ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
