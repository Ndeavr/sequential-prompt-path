import { MessageSquare } from "lucide-react";
import type { AIPPv2AuditScores } from "@/hooks/useAIPPv2Audit";

function generateInterpretation(scores: AIPPv2AuditScores, domain: string): string {
  const parts: string[] = [];

  if (scores.score_global >= 70) {
    parts.push(`${domain} a un bon positionnement IA global (${scores.score_global}/100).`);
  } else if (scores.score_global >= 40) {
    parts.push(`${domain} a un positionnement IA moyen (${scores.score_global}/100) avec des axes d'amélioration importants.`);
  } else {
    parts.push(`${domain} est peu visible pour les moteurs IA (${scores.score_global}/100). Des actions urgentes sont nécessaires.`);
  }

  // Weakest dimension
  const dims = [
    { key: "AEO", score: scores.score_aeo },
    { key: "Autorité", score: scores.score_authority },
    { key: "Conversion", score: scores.score_conversion },
    { key: "Local", score: scores.score_local },
    { key: "Tech SEO", score: scores.score_tech },
  ];
  const weakest = dims.sort((a, b) => a.score - b.score)[0];

  if (weakest.score < 40) {
    parts.push(`Le point le plus faible est ${weakest.key} (${weakest.score}/100) — c'est là qu'il faut concentrer les efforts.`);
  }

  if (scores.revenue_loss_estimate > 500) {
    parts.push(`Sans optimisation, vous perdez environ ${scores.revenue_loss_estimate.toLocaleString("fr-CA")} $/mois en opportunités.`);
  }

  return parts.join(" ");
}

export default function PanelAlexInterpretation({ scores, domain }: { scores: AIPPv2AuditScores; domain: string }) {
  const text = generateInterpretation(scores, domain);

  return (
    <div className="bg-card border border-primary/20 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Ce qu'Alex en pense</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
