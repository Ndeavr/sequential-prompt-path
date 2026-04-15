import { Activity, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { SimulationRun, SimulationStep } from "@/hooks/useQASimulation";

interface Props {
  run: SimulationRun;
  steps: SimulationStep[];
}

export default function PanelSimulationResultSummary({ run, steps }: Props) {
  const passed = steps.filter((s) => s.status === "passed").length;
  const failed = steps.filter((s) => s.status === "failed").length;
  const total = steps.length;
  const score = run.health_score ?? 0;

  const scoreColor = score >= 90 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : "text-red-400";
  const statusLabel = run.status === "passed" ? "Réussi" : run.status === "failed" ? "Échoué" : run.status === "running" ? "En cours" : run.status;

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Résumé</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          run.status === "passed" ? "bg-emerald-400/10 text-emerald-400" :
          run.status === "failed" ? "bg-red-400/10 text-red-400" :
          "bg-primary/10 text-primary"
        }`}>{statusLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className={`text-2xl font-bold ${scoreColor}`}>{score}</p>
          <p className="text-xs text-muted-foreground">Score santé</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{passed}/{total}</p>
          <p className="text-xs text-muted-foreground">Étapes réussies</p>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <XCircle className="w-4 h-4 text-red-400" />
          <span className="text-foreground">{run.critical_failures_count} critiques</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <span className="text-foreground">{run.warnings_count} avertissements</span>
        </div>
      </div>
    </div>
  );
}
