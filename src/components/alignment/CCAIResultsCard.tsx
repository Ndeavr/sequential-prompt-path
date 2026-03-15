/**
 * UNPRO — CCAI Results Card
 * Full compatibility breakdown with category scores and explanation.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, MessageSquare, Users, Wrench, Scale, Shield } from "lucide-react";
import CCAICompatibilityBadge from "./CCAICompatibilityBadge";
import type { CCAIEngineOutput } from "@/services/ccaiEngine";
import type { CCAICategoryScore } from "@/services/ccaiEngine";

interface CCAIResultsCardProps {
  output: CCAIEngineOutput;
  contractorName?: string;
}

const CATEGORY_META: Record<string, { labelFr: string; icon: React.ElementType }> = {
  language_communication: { labelFr: "Communication", icon: MessageSquare },
  involvement_complexity: { labelFr: "Implication & complexité", icon: Users },
  scale_environment: { labelFr: "Environnement & échelle", icon: Wrench },
  trust_values: { labelFr: "Confiance & valeurs", icon: Shield },
  professional_boundaries: { labelFr: "Limites professionnelles", icon: Scale },
};

function CategoryRow({ score }: { score: CCAICategoryScore }) {
  const meta = CATEGORY_META[score.category] ?? { labelFr: score.category, icon: Wrench };
  const Icon = meta.icon;
  const pct = Math.round(score.percent);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {meta.labelFr}
        </span>
        <span className="font-medium">{score.matched}/{score.total}</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

export default function CCAIResultsCard({ output, contractorName }: CCAIResultsCardProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              Indice de compatibilité
              {contractorName && <span className="text-muted-foreground font-normal"> — {contractorName}</span>}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{output.ccaiLabelFr}</p>
          </div>
          <CCAICompatibilityBadge output={output} size="lg" />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Category breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Détail par catégorie</h4>
          {output.categoryBreakdown.map((cat) => (
            <CategoryRow key={cat.category} score={cat} />
          ))}
        </div>

        {/* Strengths */}
        {output.topStrengthsFr.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Points forts
            </h4>
            <ul className="space-y-1">
              {output.topStrengthsFr.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground pl-6">• {s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Watchouts */}
        {output.topWatchoutsFr.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Points d'attention
            </h4>
            <ul className="space-y-1">
              {output.topWatchoutsFr.map((w, i) => (
                <li key={i} className="text-sm text-muted-foreground pl-6">• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendation */}
        <div className="rounded-lg bg-muted/50 p-3 border border-border/50">
          <p className="text-sm text-foreground">{output.recommendationTextFr}</p>
        </div>
      </CardContent>
    </Card>
  );
}
