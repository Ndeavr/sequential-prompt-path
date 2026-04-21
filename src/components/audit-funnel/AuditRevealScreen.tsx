import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface Props {
  contractorId: string | null;
  auditId: string | null;
  score: number | null;
  confidence: "low" | "medium" | "high" | null;
  onContinue: () => void;
}

const scoreLabel = (s: number) => {
  if (s >= 90) return "Position très forte";
  if (s >= 75) return "Bonne présence, optimisation possible";
  if (s >= 60) return "Base solide, potentiel bloqué";
  if (s >= 40) return "Visibilité IA faible";
  return "Présence très fragile";
};

export function AuditRevealScreen({ score, confidence, onContinue }: Props) {
  const showScore = score !== null;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-16 pb-16 text-center">
      <h2 className="font-display text-2xl font-bold mb-2">
        {showScore ? "Votre AIPP réel" : "Analyse partielle"}
      </h2>
      <p className="text-sm text-muted-foreground mb-8">
        Voici ce que vos signaux envoient aujourd'hui à Google, aux IA et à vos futurs clients.
      </p>

      {showScore ? (
        <div className="rounded-3xl border border-border/30 bg-card/20 backdrop-blur-md p-10 mb-8 inline-block">
          <div className="text-6xl font-bold text-primary mb-2">{Math.round(score)}</div>
          <div className="text-sm text-muted-foreground">/ 100</div>
          <div className="mt-3 text-sm font-medium">{scoreLabel(score)}</div>
          {confidence && (
            <div className={`mt-2 inline-flex px-3 py-1 rounded-full text-xs ${
              confidence === "high" ? "bg-green-500/10 text-green-400" :
              confidence === "medium" ? "bg-amber-500/10 text-amber-400" :
              "bg-border/20 text-muted-foreground"
            }`}>
              Confiance {confidence === "high" ? "élevée" : confidence === "medium" ? "moyenne" : "faible"}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-10 mb-8">
          <p className="text-amber-300 text-sm">
            Certaines données sont encore en cours de vérification. Un score provisoire sera bientôt disponible.
          </p>
        </div>
      )}

      <p className="text-muted-foreground mb-6">
        Votre potentiel est réel. Le plus rentable maintenant est de corriger vos blocages prioritaires avec le bon niveau d'activation.
      </p>

      <Button size="lg" onClick={onContinue} className="gap-2">
        Voir mon plan recommandé <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
