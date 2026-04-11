import { Bot } from "lucide-react";

interface Props {
  score: number;
  riskCount: number;
}

export default function PanelAlexClosingConversion({ score, riskCount }: Props) {
  return (
    <div className="flex gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
      <div className="shrink-0 p-2 rounded-lg bg-primary/10">
        <Bot className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Alex</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Votre score est de {score}% avec {riskCount} risque{riskCount > 1 ? "s" : ""} détecté{riskCount > 1 ? "s" : ""}.
          Débloquez l'accès complet pour corriger chaque point et atteindre la pleine conformité Loi 16.
        </p>
      </div>
    </div>
  );
}
