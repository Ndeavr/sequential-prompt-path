/**
 * UNPRO — Panel Plan Distribution
 * Shows distribution profile preview and slot allocation for a cluster.
 */
import { useState } from "react";
import { BarChart3, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DistributionProfile, PlanCode } from "@/services/planCapacityEngine";
import { computePlanSlots, DISTRIBUTION_PROFILES } from "@/services/planCapacityEngine";

interface PanelPlanDistributionProps {
  maxContractors: number;
  currentProfile?: DistributionProfile;
  onProfileChange?: (profile: DistributionProfile) => void;
}

const PROFILES: { key: DistributionProfile; label: string; desc: string }[] = [
  { key: "standard", label: "Standard", desc: "Équilibrée — entrée accessible" },
  { key: "premium", label: "Premium", desc: "Focus milieu de gamme" },
  { key: "strategic", label: "Stratégique", desc: "Maximise Premium / Élite" },
];

const PLAN_COLORS: Record<PlanCode, string> = {
  recrue: "bg-slate-500",
  pro: "bg-blue-500",
  premium: "bg-amber-500",
  elite: "bg-purple-500",
  signature: "bg-gradient-to-r from-amber-400 to-orange-500",
};

const PLAN_LABELS: Record<PlanCode, string> = {
  recrue: "Recrue",
  pro: "Pro",
  premium: "Premium",
  elite: "Élite",
  signature: "Signature",
};

export default function PanelPlanDistribution({
  maxContractors,
  currentProfile = "standard",
  onProfileChange,
}: PanelPlanDistributionProps) {
  const [profile, setProfile] = useState<DistributionProfile>(currentProfile);
  const slots = computePlanSlots(maxContractors, profile);
  const dist = DISTRIBUTION_PROFILES[profile];

  const handleChange = (p: DistributionProfile) => {
    setProfile(p);
    onProfileChange?.(p);
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Distribution des plans</h3>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{maxContractors} slots</span>
      </div>

      {/* Profile selector */}
      <div className="flex gap-2">
        {PROFILES.map(p => (
          <button
            key={p.key}
            onClick={() => handleChange(p.key)}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2.5 text-left transition-all",
              profile === p.key
                ? "border-primary/30 bg-primary/5"
                : "border-border/30 hover:bg-muted/10"
            )}
          >
            <span className={cn("text-xs font-semibold", profile === p.key ? "text-primary" : "text-foreground")}>
              {p.label}
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
          </button>
        ))}
      </div>

      {/* Distribution bar */}
      <div className="h-6 rounded-full overflow-hidden flex">
        {(["recrue", "pro", "premium", "elite", "signature"] as PlanCode[]).map(plan => (
          <div
            key={plan}
            className={cn("h-full transition-all duration-500", PLAN_COLORS[plan])}
            style={{ width: `${(dist[plan] || 0) * 100}%` }}
            title={`${PLAN_LABELS[plan]}: ${Math.round((dist[plan] || 0) * 100)}%`}
          />
        ))}
      </div>

      {/* Legend / slots */}
      <div className="grid grid-cols-5 gap-2">
        {(["signature", "elite", "premium", "pro", "recrue"] as PlanCode[]).map(plan => (
          <div key={plan} className="text-center">
            <div className={cn("w-3 h-3 rounded-full mx-auto mb-1", PLAN_COLORS[plan])} />
            <p className="text-[10px] font-semibold text-foreground">{PLAN_LABELS[plan]}</p>
            <p className="text-xs font-mono text-primary">{slots[plan]}</p>
            <p className="text-[10px] text-muted-foreground">{Math.round((dist[plan] || 0) * 100)}%</p>
          </div>
        ))}
      </div>

      {/* Revenue estimate */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        <div>
          <p className="text-[10px] text-muted-foreground">Revenu projeté mensuel (100% occupancy)</p>
          <p className="text-sm font-bold text-emerald-400 font-mono">
            {((slots.recrue * 99 + slots.pro * 199 + slots.premium * 399 + slots.elite * 699 + slots.signature * 1499)).toLocaleString("fr-CA")} $
          </p>
        </div>
      </div>
    </div>
  );
}
