import { TrendingDown } from "lucide-react";
import type { SimulationStep } from "@/hooks/useQASimulation";

interface Props {
  steps: SimulationStep[];
}

export default function WidgetFunnelDropoffSummary({ steps }: Props) {
  const firstFail = steps.find((s) => s.status === "failed");

  return (
    <div className="glass-card rounded-xl p-3 text-center">
      <TrendingDown className={`w-5 h-5 mx-auto mb-1 ${firstFail ? "text-yellow-400" : "text-emerald-400"}`} />
      <p className="text-sm font-semibold text-foreground">
        {firstFail ? firstFail.step_label : "Aucun"}
      </p>
      <p className="text-xs text-muted-foreground">Point de rupture</p>
    </div>
  );
}
