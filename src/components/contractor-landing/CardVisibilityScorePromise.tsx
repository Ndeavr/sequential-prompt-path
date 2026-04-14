import { Sparkles, TrendingUp, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function CardVisibilityScorePromise() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-5 space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          Votre score de visibilité IA
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-primary">?</div>
            <div className="text-xs text-muted-foreground">Score actuel</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
              <TrendingUp className="w-4 h-4" /> 85+
            </div>
            <div className="text-xs text-muted-foreground">Potentiel</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> 8+
            </div>
            <div className="text-xs text-muted-foreground">RDV / mois</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Découvrez en 30 secondes comment ChatGPT, Gemini et Perplexity perçoivent votre entreprise.
        </p>
      </CardContent>
    </Card>
  );
}
