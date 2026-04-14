/**
 * UNPRO — Domain Health Card
 */
import { Globe, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import type { DomainSnapshot } from "@/hooks/useEmailHealthCenter";

interface Props {
  snapshot: DomainSnapshot;
}

const STATUS_ICON: Record<string, { icon: typeof CheckCircle; color: string }> = {
  passed: { icon: CheckCircle, color: "text-emerald-500" },
  valid: { icon: CheckCircle, color: "text-emerald-500" },
  active: { icon: CheckCircle, color: "text-emerald-500" },
  failed: { icon: XCircle, color: "text-destructive" },
  warning: { icon: AlertTriangle, color: "text-amber-500" },
  unknown: { icon: AlertTriangle, color: "text-muted-foreground" },
};

function StatusDot({ status, label }: { status: string; label: string }) {
  const s = STATUS_ICON[status] || STATUS_ICON.unknown;
  const Icon = s.icon;
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3.5 w-3.5 ${s.color}`} />
      <span className="text-xs text-foreground">{label}</span>
    </div>
  );
}

const CardDomainHealth = ({ snapshot }: Props) => {
  const overallColor = snapshot.overall_status === "active" ? "border-emerald-500/20" : snapshot.overall_status === "warning" ? "border-amber-500/20" : "border-destructive/20";

  return (
    <div className={`rounded-xl border ${overallColor} bg-card p-4 space-y-3`}>
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{snapshot.domain}</h3>
        <span className="ml-auto text-xs font-bold text-foreground">{snapshot.score}%</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatusDot status={snapshot.spf_status} label="SPF" />
        <StatusDot status={snapshot.dkim_status} label="DKIM" />
        <StatusDot status={snapshot.dmarc_status} label="DMARC" />
        <StatusDot status={snapshot.mx_status} label="MX" />
        <StatusDot status={snapshot.return_path_status} label="Return-Path" />
      </div>
    </div>
  );
};

export default CardDomainHealth;
