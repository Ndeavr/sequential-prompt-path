/**
 * UNPRO — CCAI Compatibility Badge
 * Displays score /25 with color-coded interpretation.
 */

import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { CCAIEngineOutput } from "@/services/ccaiEngine";

interface CCAICompatibilityBadgeProps {
  output: CCAIEngineOutput;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const getBadgeConfig = (score: number) => {
  if (score >= 17) return { color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", icon: CheckCircle2, labelFr: "Forte compatibilité" };
  if (score >= 9) return { color: "bg-amber-500/15 text-amber-700 border-amber-500/30", icon: Shield, labelFr: "Compatibilité modérée" };
  return { color: "bg-red-500/15 text-red-700 border-red-500/30", icon: score >= 1 ? AlertTriangle : XCircle, labelFr: "Faible compatibilité" };
};

export default function CCAICompatibilityBadge({ output, size = "md", showLabel = true }: CCAICompatibilityBadgeProps) {
  const config = getBadgeConfig(output.ccaiScore25);
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-1.5 gap-2",
  };

  return (
    <Badge variant="outline" className={`${config.color} ${sizeClasses[size]} font-medium inline-flex items-center`}>
      <Icon className={size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5"} />
      <span className="font-bold">{output.ccaiScore25}/25</span>
      {showLabel && <span className="hidden sm:inline">— {config.labelFr}</span>}
    </Badge>
  );
}
