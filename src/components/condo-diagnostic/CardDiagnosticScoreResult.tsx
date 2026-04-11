import ScoreRing from "@/components/ui/score-ring";
import { getRiskColor, getRiskBg, type DiagnosticResult } from "@/lib/condoDiagnosticScoring";
import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";

interface Props {
  result: DiagnosticResult;
}

const RISK_ICONS = {
  critical: ShieldAlert,
  high: AlertTriangle,
  medium: AlertTriangle,
  low: ShieldCheck,
};

const RISK_LABELS = {
  critical: "Critique",
  high: "Élevé",
  medium: "Modéré",
  low: "Faible",
};

export default function CardDiagnosticScoreResult({ result }: Props) {
  const Icon = RISK_ICONS[result.riskLevel];

  return (
    <div className="glass-card rounded-2xl border border-border/50 p-6 space-y-4 text-center">
      <h3 className="text-lg font-display font-bold text-foreground">
        Votre score de conformité
      </h3>

      <div className="flex justify-center">
        <ScoreRing score={result.score} size={120} strokeWidth={10} label="Conformité" />
      </div>

      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getRiskBg(result.riskLevel)} ${getRiskColor(result.riskLevel)}`}>
        <Icon className="h-4 w-4" />
        Risque {RISK_LABELS[result.riskLevel]}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {result.summary}
      </p>
    </div>
  );
}
