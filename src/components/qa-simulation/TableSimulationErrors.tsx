import { AlertTriangle, XCircle } from "lucide-react";
import type { SimulationError } from "@/hooks/useQASimulation";

interface Props {
  errors: SimulationError[];
}

export default function TableSimulationErrors({ errors }: Props) {
  if (errors.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Aucune erreur 🎉</p>;

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {errors.map((err) => (
        <div key={err.id} className="glass-card rounded-lg p-3 border border-red-500/20">
          <div className="flex items-start gap-2">
            {err.severity === "critical" ? (
              <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{err.error_title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{err.error_message}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground">{err.error_code}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  err.severity === "critical" ? "bg-red-400/10 text-red-400" : "bg-yellow-400/10 text-yellow-400"
                }`}>{err.severity}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
