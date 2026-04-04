/**
 * UNPRO — Table Plan Capacity
 * Displays plan slots, occupancy, pricing and scarcity per cluster.
 */
import BadgePlanScarcity from "./BadgePlanScarcity";
import { Progress } from "@/components/ui/progress";
import type { ClusterCapacity, PlanDefinition, ClusterValueTier } from "@/services/planCapacityEngine";
import { computeEffectivePrice, getRemainingSlots, getOccupancyPercent } from "@/services/planCapacityEngine";

interface TablePlanCapacityProps {
  capacities: ClusterCapacity[];
  plans: PlanDefinition[];
  valueTier?: ClusterValueTier;
}

export default function TablePlanCapacity({ capacities, plans, valueTier = "medium" }: TablePlanCapacityProps) {
  const sorted = [...capacities].sort((a, b) => {
    const pa = plans.find(p => p.code === a.plan_code);
    const pb = plans.find(p => p.code === b.plan_code);
    return (pb?.rank ?? 0) - (pa?.rank ?? 0);
  });

  return (
    <div className="rounded-xl border border-border/40 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/30 bg-muted/5">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Plan</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Max</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Occupé</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Restant</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Prix eff.</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Rareté</th>
              <th className="px-3 py-3 hidden md:table-cell" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(cap => {
              const plan = plans.find(p => p.code === cap.plan_code);
              if (!plan) return null;
              const remaining = getRemainingSlots(cap);
              const pct = getOccupancyPercent(cap);
              const effectivePrice = computeEffectivePrice(plan.base_price_monthly, cap.scarcity_status, valueTier);

              return (
                <tr key={cap.id} className="border-b border-border/20 hover:bg-muted/5 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-foreground">{plan.name}</span>
                  </td>
                  <td className="text-center px-3 py-3 text-muted-foreground font-mono">{cap.max_slots}</td>
                  <td className="text-center px-3 py-3 font-mono text-foreground">{cap.occupied_slots}</td>
                  <td className="text-center px-3 py-3 font-mono">
                    <span className={remaining <= 3 ? "text-orange-400 font-bold" : "text-emerald-400"}>
                      {remaining}
                    </span>
                  </td>
                  <td className="text-center px-3 py-3 font-mono text-foreground hidden sm:table-cell">
                    {(effectivePrice / 100).toFixed(0)}$
                  </td>
                  <td className="text-center px-3 py-3">
                    <BadgePlanScarcity status={cap.scarcity_status} remaining={remaining} />
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <Progress value={pct} className="h-1.5 w-20" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
