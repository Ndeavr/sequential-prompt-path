/**
 * UNPRO — Email Health Hero with global status indicator
 */
import { Shield, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import type { EmailSystemStatus } from "@/hooks/useEmailHealthCenter";

interface Props {
  status: EmailSystemStatus | undefined;
  isLoading: boolean;
}

const STATUS_CONFIG = {
  active: { icon: Shield, label: "Système email actif", color: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30" },
  warning: { icon: AlertTriangle, label: "Ajustements recommandés", color: "text-amber-500", bg: "bg-amber-500/10", ring: "ring-amber-500/30" },
  critical: { icon: XCircle, label: "Envoi à risque — correction requise", color: "text-destructive", bg: "bg-destructive/10", ring: "ring-destructive/30" },
  pending: { icon: Loader2, label: "Audit en cours…", color: "text-muted-foreground", bg: "bg-muted/30", ring: "ring-border/20" },
};

const HeroSectionEmailHealthStatus = ({ status, isLoading }: Props) => {
  const s = status?.status || "pending";
  const config = STATUS_CONFIG[s] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <div className={`rounded-2xl border ${config.ring} ring-1 ${config.bg} p-6 space-y-4`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${config.bg}`}>
          <Icon className={`h-8 w-8 ${config.color} ${isLoading || s === "pending" ? "animate-spin" : ""}`} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{config.label}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {status ? `Score: ${status.score}% · ${status.passed}/${status.total_checks} vérifications passées` : "Lancez un audit pour voir le statut"}
          </p>
        </div>
      </div>

      {status && (
        <div className="grid grid-cols-4 gap-2">
          <MiniStat label="Passé" value={status.passed} color="text-emerald-500" />
          <MiniStat label="Échoué" value={status.failed} color="text-destructive" />
          <MiniStat label="Avertis." value={status.warnings} color="text-amber-500" />
          <MiniStat label="Bloquant" value={status.blocking_issues} color="text-destructive" />
        </div>
      )}
    </div>
  );
};

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center py-2 rounded-lg bg-background/50">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

export default HeroSectionEmailHealthStatus;
