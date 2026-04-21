import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { getPlanLabel } from "@/services/planRecommendationService";
import type { RecommendedPlan } from "@/types/outreachFunnel";
import { useNavigate } from "react-router-dom";

interface Props {
  businessName?: string;
  plan: RecommendedPlan | null;
  auditId: string | null;
}

export function AuditSuccessScreen({ businessName, plan }: Props) {
  const navigate = useNavigate();

  return (
    <div className="max-w-lg mx-auto px-4 pt-20 pb-16 text-center">
      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-8 h-8 text-green-400" />
      </div>
      <h1 className="font-display text-3xl font-bold mb-4">
        Bienvenue dans UNPRO.
      </h1>
      <p className="text-lg text-muted-foreground mb-2">
        Votre activation commence maintenant.
      </p>
      {businessName && (
        <p className="text-primary font-medium mb-6">{businessName}</p>
      )}
      {plan && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-6 py-3 inline-block mb-8">
          <span className="text-sm">Plan activé : </span>
          <strong className="text-primary">{getPlanLabel(plan)}</strong>
        </div>
      )}

      <div className="rounded-2xl border border-border/30 bg-card/20 p-6 mb-8 text-left text-sm space-y-3">
        {[
          "Profil créé",
          "Audit sauvegardé",
          "Plan activé",
          "Prochaine étape visible",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={() => navigate("/pro/profile")} className="gap-2">
          Compléter mon profil <ArrowRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="lg" onClick={() => navigate("/alex")}>
          Parler à Alex pour continuer
        </Button>
      </div>
    </div>
  );
}
