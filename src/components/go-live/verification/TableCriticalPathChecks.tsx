import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import type { VerificationStatus } from "./CardVerificationStatus";

export interface CriticalCheck {
  id: string;
  step_key: string;
  step_name: string;
  status: VerificationStatus;
  evidence?: string;
  isMock?: boolean;
  durationMs?: number;
  lastChecked?: string;
}

interface TableCriticalPathChecksProps {
  checks: CriticalCheck[];
  onRetry?: (stepKey: string) => void;
}

const statusBadge: Record<VerificationStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  passed: { variant: "default", label: "✓ Passed" },
  partial: { variant: "secondary", label: "◐ Partial" },
  failed: { variant: "destructive", label: "✗ Failed" },
  blocked: { variant: "destructive", label: "⊘ Blocked" },
  not_tested: { variant: "outline", label: "— N/T" },
  running: { variant: "secondary", label: "⟳ Running" },
};

export default function TableCriticalPathChecks({ checks, onRetry }: TableCriticalPathChecksProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Étape</TableHead>
            <TableHead className="text-xs w-24">Statut</TableHead>
            <TableHead className="text-xs w-16">Durée</TableHead>
            <TableHead className="text-xs w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {checks.map((c) => {
            const badge = statusBadge[c.status];
            return (
              <TableRow key={c.id}>
                <TableCell className="text-xs">
                  <div>
                    <span className="font-medium">{c.step_name}</span>
                    {c.isMock && <Badge variant="outline" className="ml-2 text-[9px] text-yellow-500 border-yellow-500/30">MOCK</Badge>}
                  </div>
                  {c.evidence && <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[250px]">{c.evidence}</p>}
                </TableCell>
                <TableCell><Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge></TableCell>
                <TableCell className="text-[10px] text-muted-foreground font-mono">{c.durationMs != null ? `${c.durationMs}ms` : "—"}</TableCell>
                <TableCell>
                  {onRetry && c.status !== "passed" && c.status !== "running" && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onRetry(c.step_key)}>
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
