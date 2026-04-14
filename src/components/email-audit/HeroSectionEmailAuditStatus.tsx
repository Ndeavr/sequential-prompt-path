/**
 * UNPRO — Hero section showing real audit run status from database
 */
import { Shield, AlertTriangle, XCircle, Loader2, Clock, Ban } from "lucide-react";
import type { AuditRun } from "@/hooks/useEmailAuditCenter";

interface Props {
  run: AuditRun | null;
  isRunning: boolean;
  progress?: { current: number; total: number };
}

const STATUS_MAP: Record<string, { icon: any; label: string; color: string; bg: string; ring: string }> = {
  completed: { icon: Shield, label: "Audit terminé — Système opérationnel", color: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30" },
  completed_with_warnings: { icon: AlertTriangle, label: "Audit terminé — Ajustements recommandés", color: "text-amber-500", bg: "bg-amber-500/10", ring: "ring-amber-500/30" },
  blocked: { icon: Ban, label: "Audit terminé — Blocages détectés", color: "text-destructive", bg: "bg-destructive/10", ring: "ring-destructive/30" },
  failed: { icon: XCircle, label: "Audit échoué", color: "text-destructive", bg: "bg-destructive/10", ring: "ring-destructive/30" },
  running: { icon: Loader2, label: "Audit en cours…", color: "text-muted-foreground", bg: "bg-muted/30", ring: "ring-border/20" },
  queued: { icon: Clock, label: "Audit en file d'attente…", color: "text-muted-foreground", bg: "bg-muted/30", ring: "ring-border/20" },
};

const EMPTY_CONFIG = { icon: Clock, label: "Aucun audit lancé", color: "text-muted-foreground", bg: "bg-muted/30", ring: "ring-border/20" };

const HeroSectionEmailAuditStatus = ({ run, isRunning, progress }: Props) => {
  const effectiveStatus = isRunning ? "running" : run?.status || "none";
  const config = STATUS_MAP[effectiveStatus] || EMPTY_CONFIG;
  const Icon = config.icon;

  const score = run?.score_percent ?? 0;
  const passed = run?.passed_count ?? 0;
  const total = run?.total_checks ?? 0;
  const hasData = !!run && total > 0;

  return (
    <div className={`rounded-2xl border ${config.ring} ring-1 ${config.bg} p-6 space-y-4`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${config.bg}`}>
          <Icon className={`h-8 w-8 ${config.color} ${isRunning || effectiveStatus === "queued" ? "animate-spin" : ""}`} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{config.label}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isRunning && progress
              ? `Vérification ${progress.current} / ${progress.total} en cours…`
              : hasData
                ? `Score: ${score}% · ${passed}/${total} vérifications passées`
                : "Lancez un audit pour voir le statut"}
          </p>
        </div>
      </div>

      {hasData && !isRunning && (
        <div className="grid grid-cols-4 gap-2">
          <MiniStat label="Passé" value={run.passed_count} color="text-emerald-500" />
          <MiniStat label="Échoué" value={run.failed_count} color="text-destructive" />
          <MiniStat label="Avertis." value={run.warning_count} color="text-amber-500" />
          <MiniStat label="Bloquant" value={run.blocking_count} color="text-destructive" />
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

export default HeroSectionEmailAuditStatus;
