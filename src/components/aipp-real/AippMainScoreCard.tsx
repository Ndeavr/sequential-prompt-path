import type { AippAuditViewModel } from "@/types/aippReal";
import ScoreRing from "@/components/ui/score-ring";
import { Shield, Eye } from "lucide-react";

const confidenceLabels = { low: "Confiance faible", medium: "Confiance moyenne", high: "Confiance élevée" };
const confidenceColors = { low: "text-destructive", medium: "text-accent", high: "text-success" };

export default function AippMainScoreCard({ model }: { model: AippAuditViewModel }) {
  const showScore = model.overallScore != null;

  return (
    <div className="glass-card p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {showScore ? (
          <ScoreRing score={model.overallScore!} size={120} strokeWidth={10} label="AIPP" />
        ) : (
          <div className="w-[120px] h-[120px] rounded-full border-4 border-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">—</span>
          </div>
        )}
        <div className="space-y-2 text-center sm:text-left">
          <h2 className="text-xl font-bold">{model.companyName}</h2>
          {showScore && (
            <>
              <p className="text-lg font-semibold">
                {model.overallScore} / 100
                {model.isProvisional && <span className="text-accent text-sm ml-2">provisoire</span>}
              </p>
              {model.statusLabel && (
                <p className="text-muted-foreground text-sm">{model.statusLabel}</p>
              )}
            </>
          )}
          {!showScore && (
            <p className="text-muted-foreground text-sm">Score non disponible — données insuffisantes</p>
          )}

          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${confidenceColors[model.confidenceLevel]}`}>
              <Shield className="h-3 w-3" />
              {confidenceLabels[model.confidenceLevel]}
            </span>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border text-muted-foreground">
              <Eye className="h-3 w-3" />
              {model.validatedSignalsCount} / {model.totalPossibleSignalsCount} signaux
            </span>
          </div>
        </div>
      </div>

      {showScore && (
        <p className="text-sm text-muted-foreground">
          {model.overallScore! >= 60
            ? "Votre entreprise existe bien en ligne, mais plusieurs signaux peuvent encore être optimisés."
            : "Plusieurs signaux empêchent les IA et les clients de bien vous comprendre et de vous choisir rapidement."}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition">
          Corriger mes points faibles
        </button>
        <button className="px-5 py-2.5 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-muted/50 transition">
          Parler à Alex
        </button>
      </div>
    </div>
  );
}
