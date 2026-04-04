/**
 * UNPRO — Widget Upgrade Pressure
 * Displays contextual upgrade nudges based on scarcity.
 */
import { ArrowUpRight, AlertTriangle, Flame, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UpgradePressureMessage } from "@/services/planCapacityEngine";

interface WidgetUpgradePressureProps {
  message: UpgradePressureMessage;
  onUpgrade?: (targetPlan: string) => void;
  className?: string;
}

const URGENCY_CONFIG = {
  low: { icon: ArrowUpRight, border: "border-muted/30", bg: "bg-muted/5", text: "text-muted-foreground" },
  medium: { icon: AlertTriangle, border: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-400" },
  high: { icon: Flame, border: "border-orange-500/30", bg: "bg-orange-500/5", text: "text-orange-400" },
  critical: { icon: Lock, border: "border-red-500/30", bg: "bg-red-500/5", text: "text-red-400" },
};

export default function WidgetUpgradePressure({ message, onUpgrade, className }: WidgetUpgradePressureProps) {
  const cfg = URGENCY_CONFIG[message.urgency];
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 transition-all",
        cfg.border,
        cfg.bg,
        message.urgency === "critical" && "shadow-[0_0_20px_rgba(239,68,68,0.1)]",
        message.urgency === "high" && "shadow-[0_0_15px_rgba(249,115,22,0.08)]",
        className
      )}
    >
      {(message.urgency === "critical" || message.urgency === "high") && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-pulse pointer-events-none" />
      )}

      <div className="flex items-start gap-3 relative z-10">
        <div className={cn("p-2 rounded-lg border", cfg.border, cfg.bg)}>
          <Icon className={cn("w-4 h-4", cfg.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", cfg.text)}>{message.text}</p>
          {message.targetPlan && onUpgrade && (
            <button
              onClick={() => onUpgrade(message.targetPlan!)}
              className={cn(
                "mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:scale-[1.02]",
                cfg.border,
                cfg.text,
                "hover:bg-white/5"
              )}
            >
              <ArrowUpRight className="w-3 h-3" />
              Passer au plan supérieur
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
