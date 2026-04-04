/**
 * UNPRO — Progress Bar Appointment Usage
 */
import { cn } from "@/lib/utils";

interface ProgressBarAppointmentUsageProps {
  consumed: number;
  included: number;
  className?: string;
}

export default function ProgressBarAppointmentUsage({ consumed, included, className }: ProgressBarAppointmentUsageProps) {
  const pct = included > 0 ? Math.min((consumed / included) * 100, 100) : 100;
  const overPct = included > 0 && consumed > included ? Math.min(((consumed - included) / included) * 100, 50) : 0;
  const isWarning = pct >= 80;
  const isExceeded = consumed > included;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">
          {consumed.toFixed(1)} / {included.toFixed(1)} unités
        </span>
        <span className={cn("font-bold font-mono", isExceeded ? "text-red-400" : isWarning ? "text-amber-400" : "text-emerald-400")}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted/20 overflow-hidden relative">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isExceeded ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
          )}
          style={{ width: `${pct}%` }}
        />
        {overPct > 0 && (
          <div
            className="absolute top-0 right-0 h-full bg-red-500/30 animate-pulse"
            style={{ width: `${overPct}%` }}
          />
        )}
      </div>
      {isExceeded && (
        <p className="text-[10px] text-red-400 font-medium">
          +{(consumed - included).toFixed(1)} unités en dépassement
        </p>
      )}
    </div>
  );
}
