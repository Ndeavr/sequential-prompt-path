import { Bot, Clock, CheckCircle2, XCircle, FileText, AlertTriangle, Pause, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AutomationStats } from "@/services/automationService";

const items = [
  { key: "activeAgents", label: "Agents actifs", icon: Bot, color: "text-emerald-500" },
  { key: "pausedAgents", label: "En pause", icon: Pause, color: "text-muted-foreground" },
  { key: "queuedJobs", label: "En attente", icon: Clock, color: "text-amber-500" },
  { key: "runningJobs", label: "En cours", icon: Zap, color: "text-blue-500" },
  { key: "todayCompleted", label: "Complétés (24h)", icon: CheckCircle2, color: "text-emerald-500" },
  { key: "todayFailed", label: "Échoués (24h)", icon: XCircle, color: "text-destructive" },
  { key: "todayPages", label: "Pages générées", icon: FileText, color: "text-primary" },
  { key: "criticalAlerts", label: "Alertes critiques", icon: AlertTriangle, color: "text-destructive" },
] as const;

export default function AutomationStatsCards({ stats }: { stats: AutomationStats | undefined }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ key, label, icon: Icon, color }) => (
        <Card key={key} className="border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Icon className={`h-5 w-5 shrink-0 ${color}`} />
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-none">{stats?.[key] ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
