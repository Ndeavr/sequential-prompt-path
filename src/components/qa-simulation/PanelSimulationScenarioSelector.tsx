import { useSimulationScenarios } from "@/hooks/useQASimulation";
import { Layers } from "lucide-react";

export default function PanelSimulationScenarioSelector() {
  const { data: scenarios = [], isLoading } = useSimulationScenarios();

  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" /> Scénarios disponibles
      </h3>
      {isLoading ? (
        <p className="text-sm text-muted-foreground animate-pulse">Chargement…</p>
      ) : (
        <div className="space-y-2">
          {scenarios.map((s) => (
            <div key={s.id} className="bg-muted/10 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  s.severity_level === "critical" ? "bg-red-400/10 text-red-400" :
                  s.severity_level === "high" ? "bg-yellow-400/10 text-yellow-400" :
                  "bg-muted/30 text-muted-foreground"
                }`}>{s.severity_level}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(s.step_order_json as string[]).length} étapes • {s.default_environment}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
