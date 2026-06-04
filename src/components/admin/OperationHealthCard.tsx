/**
 * UNPRO — OperationHealthCard
 * Enforces Rule 8: every health card exposes Generated / Sent / Delivered / Failed / Blocked / Revenue Impact.
 * See mem://standards/production-reliability-framework
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface OperationHealthMetrics {
  generated: number;
  sent: number;
  delivered: number;
  failed: number;
  blocked: number;
  revenueImpactCents?: number;
}

interface Props {
  title: string;
  service?: string;
  metrics: OperationHealthMetrics;
  blockedReason?: string;
  nextAction?: string;
  className?: string;
}

function fmtCents(c?: number) {
  if (c == null) return "—";
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(c / 100);
}

function status(m: OperationHealthMetrics): { label: string; cls: string } {
  if (m.blocked > 0 && m.sent === 0) return { label: "BLOCKED", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  if (m.failed > 0 && m.sent === 0) return { label: "FAILED", cls: "bg-red-500/15 text-red-300 border-red-500/30" };
  if (m.delivered > 0) return { label: "HEALTHY", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
  if (m.sent > 0) return { label: "SENDING", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" };
  return { label: "IDLE", cls: "bg-muted text-muted-foreground border-border" };
}

export function OperationHealthCard({ title, service, metrics, blockedReason, nextAction, className }: Props) {
  const s = status(metrics);
  return (
    <Card className={className}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          {service && <p className="text-[10px] text-muted-foreground mt-0.5">{service}</p>}
        </div>
        <Badge variant="outline" className={cn("text-[10px]", s.cls)}>{s.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Metric label="Générés" value={metrics.generated} />
          <Metric label="Envoyés" value={metrics.sent} />
          <Metric label="Livrés" value={metrics.delivered} tone="ok" />
          <Metric label="Échecs" value={metrics.failed} tone={metrics.failed > 0 ? "bad" : undefined} />
          <Metric label="Bloqués" value={metrics.blocked} tone={metrics.blocked > 0 ? "warn" : undefined} />
          <Metric label="Impact $" value={fmtCents(metrics.revenueImpactCents)} />
        </div>
        {blockedReason && (
          <div className="text-[11px] text-amber-300/90 border-t border-border/40 pt-2">
            <span className="font-medium">Raison:</span> {blockedReason}
          </div>
        )}
        {nextAction && (
          <div className="text-[11px] text-muted-foreground">
            <span className="font-medium">Action:</span> {nextAction}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone?: "ok" | "warn" | "bad" }) {
  const cls =
    tone === "ok" ? "text-emerald-300" :
    tone === "warn" ? "text-amber-300" :
    tone === "bad" ? "text-red-300" : "text-foreground";
  return (
    <div className="rounded-md border border-border/40 bg-muted/20 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-semibold tabular-nums", cls)}>{value}</div>
    </div>
  );
}

export default OperationHealthCard;
