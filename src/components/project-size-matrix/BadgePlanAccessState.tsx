import { cn } from "@/lib/utils";
import { Check, Lock } from "lucide-react";

interface BadgePlanAccessStateProps {
  allowed: boolean;
  upgradeTarget?: string;
  className?: string;
}

export default function BadgePlanAccessState({ allowed, upgradeTarget, className }: BadgePlanAccessStateProps) {
  if (allowed) {
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md border bg-emerald-500/15 text-emerald-400 border-emerald-500/30", className)}>
        <Check className="w-3 h-3" /> Accès
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md border bg-red-500/15 text-red-400 border-red-500/30", className)}>
      <Lock className="w-3 h-3" /> {upgradeTarget ? `→ ${upgradeTarget}` : "Bloqué"}
    </span>
  );
}
