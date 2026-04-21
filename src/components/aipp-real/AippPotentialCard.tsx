import type { AippAuditViewModel } from "@/types/aippReal";
import ScoreRing from "@/components/ui/score-ring";
import { ArrowRight } from "lucide-react";

export default function AippPotentialCard({ model }: { model: AippAuditViewModel }) {
  if (model.overallScore == null || model.potentialScore == null) return null;
  const delta = model.potentialScore - model.overallScore;
  if (delta <= 0) return null;

  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="font-semibold">Potentiel après optimisation</h3>
      <div className="flex items-center justify-center gap-6">
        <ScoreRing score={model.overallScore} size={80} strokeWidth={6} label="Actuel" />
        <ArrowRight className="h-6 w-6 text-muted-foreground" />
        <ScoreRing score={model.potentialScore} size={80} strokeWidth={6} label="Potentiel" colorClass="text-success" />
      </div>
      <p className="text-sm text-muted-foreground text-center">
        En corrigeant les points les plus rentables, votre profil peut envoyer des signaux beaucoup plus forts aux IA et aux clients.
      </p>
      <p className="text-xs text-center text-muted-foreground">
        Priorité : structure + clarté + conversion
      </p>
    </div>
  );
}
