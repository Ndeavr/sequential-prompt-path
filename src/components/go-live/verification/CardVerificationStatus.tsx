import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Ban, HelpCircle, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type VerificationStatus = "passed" | "partial" | "failed" | "blocked" | "not_tested" | "running";

interface CardVerificationStatusProps {
  title: string;
  status: VerificationStatus;
  description?: string;
  lastChecked?: string;
  evidence?: string;
  isMock?: boolean;
  onRetry?: () => void;
  onOpenLogs?: () => void;
  onOpenRoute?: () => void;
  routeOrFunction?: string;
  durationMs?: number;
}

const statusConfig: Record<VerificationStatus, { icon: typeof CheckCircle2; color: string; label: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  passed: { icon: CheckCircle2, color: "text-green-500", label: "Passed", badgeVariant: "default" },
  partial: { icon: AlertTriangle, color: "text-orange-500", label: "Partial", badgeVariant: "secondary" },
  failed: { icon: XCircle, color: "text-red-500", label: "Failed", badgeVariant: "destructive" },
  blocked: { icon: Ban, color: "text-red-600", label: "Blocked", badgeVariant: "destructive" },
  not_tested: { icon: HelpCircle, color: "text-muted-foreground", label: "Not tested", badgeVariant: "outline" },
  running: { icon: RotateCcw, color: "text-blue-500 animate-spin", label: "Running…", badgeVariant: "secondary" },
};

export default function CardVerificationStatus({
  title, status, description, lastChecked, evidence, isMock, onRetry, onOpenLogs, onOpenRoute, routeOrFunction, durationMs,
}: CardVerificationStatusProps) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;

  return (
    <Card className={cn(
      "relative overflow-hidden",
      status === "blocked" && "border-red-500/50",
      status === "failed" && "border-red-400/30",
    )}>
      {isMock && (
        <div className="absolute top-0 right-0 bg-yellow-500/20 text-yellow-600 text-[10px] font-bold px-2 py-0.5 rounded-bl">
          MOCK
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={cn("h-4 w-4 flex-shrink-0", cfg.color)} />
            <CardTitle className="text-sm truncate">{title}</CardTitle>
          </div>
          <Badge variant={cfg.badgeVariant} className="text-[10px] flex-shrink-0">{cfg.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {evidence && <p className="text-[11px] bg-muted/50 p-2 rounded font-mono break-all">{evidence}</p>}
        {routeOrFunction && <p className="text-[10px] text-muted-foreground font-mono">{routeOrFunction}</p>}
        <div className="flex items-center justify-between gap-1 pt-1">
          <div className="text-[10px] text-muted-foreground">
            {lastChecked && <span>{new Date(lastChecked).toLocaleTimeString("fr-CA")}</span>}
            {durationMs != null && <span className="ml-2">{durationMs}ms</span>}
          </div>
          <div className="flex gap-1">
            {onRetry && <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={onRetry}><RotateCcw className="h-3 w-3 mr-1" />Retry</Button>}
            {onOpenLogs && <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={onOpenLogs}>Logs</Button>}
            {onOpenRoute && <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={onOpenRoute}><ExternalLink className="h-3 w-3" /></Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
