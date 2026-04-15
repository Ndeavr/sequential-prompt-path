import { Route } from "lucide-react";
import type { SimulationStep } from "@/hooks/useQASimulation";

interface Props {
  steps: SimulationStep[];
}

export default function WidgetConversionPathIntegrity({ steps }: Props) {
  const passed = steps.filter((s) => s.status === "passed").length;
  const total = steps.length;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="glass-card rounded-xl p-3 text-center">
      <Route className="w-5 h-5 mx-auto mb-1 text-primary" />
      <p className={`text-lg font-bold ${pct === 100 ? "text-emerald-400" : pct >= 60 ? "text-yellow-400" : "text-red-400"}`}>{pct}%</p>
      <p className="text-xs text-muted-foreground">Intégrité funnel</p>
    </div>
  );
}
