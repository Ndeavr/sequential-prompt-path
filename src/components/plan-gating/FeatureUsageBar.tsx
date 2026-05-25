import { cn } from "@/lib/utils";
import { useFeatureAccess } from "@/features/planSystem";
import type { FeatureKey } from "@/features/planSystem/types";

interface Props {
  featureKey: FeatureKey | string;
  used: number;
  label?: string;
  className?: string;
}

export default function FeatureUsageBar({ featureKey, used, label, className }: Props) {
  const access = useFeatureAccess(featureKey);
  if (!access.allowed) return null;
  const limit = access.limit;
  const unlimited = access.unlimited;
  const pct = unlimited || !limit ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const warn = pct >= 80;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/70">{label ?? "Utilisation"}</span>
        <span className={cn("font-semibold", warn ? "text-amber-300" : "text-white/80")}>
          {unlimited ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              warn ? "bg-amber-400" : "bg-emerald-400",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
