import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { DiagnosticRisk } from "@/lib/condoDiagnosticScoring";

interface Props {
  risk: DiagnosticRisk;
}

export default function CardDiagnosticRiskFlag({ risk }: Props) {
  const isCritical = risk.severity === "critical";

  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${
      isCritical ? "border-destructive/30 bg-destructive/5" : "border-border/50 bg-muted/30"
    }`}>
      <div className={`shrink-0 mt-0.5 ${isCritical ? "text-destructive" : "text-orange-500"}`}>
        {isCritical ? <ShieldAlert className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{risk.label}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{risk.description}</p>
      </div>
    </div>
  );
}
