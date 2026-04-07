import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import type { AvailabilityStatus } from "@/hooks/useAvailabilityCheck";

const config: Record<AvailabilityStatus, { label: string; icon: typeof CheckCircle; className: string }> = {
  available: { label: "Disponible", icon: CheckCircle, className: "bg-green-500/15 text-green-400 border-green-500/30" },
  limited: { label: "Presque complet", icon: AlertTriangle, className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  locked: { label: "Complet", icon: XCircle, className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export default function BadgeAvailabilityStatus({ status }: { status: AvailabilityStatus }) {
  const c = config[status];
  const Icon = c.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold", c.className)}>
      <Icon className="h-3.5 w-3.5" />
      {c.label}
    </span>
  );
}
