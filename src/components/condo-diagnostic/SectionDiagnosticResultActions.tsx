import CardDiagnosticPriorityAction from "./CardDiagnosticPriorityAction";
import CardDiagnosticRiskFlag from "./CardDiagnosticRiskFlag";
import type { DiagnosticResult } from "@/lib/condoDiagnosticScoring";

interface Props {
  result: DiagnosticResult;
}

export default function SectionDiagnosticResultActions({ result }: Props) {
  return (
    <div className="space-y-6">
      {/* Priority Actions */}
      {result.priorities.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-display font-semibold text-foreground">
            Actions prioritaires
          </h4>
          {result.priorities.map((action, i) => (
            <CardDiagnosticPriorityAction key={action.key} action={action} index={i} />
          ))}
        </div>
      )}

      {/* Risk Flags */}
      {result.risks.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-display font-semibold text-foreground">
            Risques détectés ({result.risks.length})
          </h4>
          {result.risks.map((risk) => (
            <CardDiagnosticRiskFlag key={risk.key} risk={risk} />
          ))}
        </div>
      )}
    </div>
  );
}
