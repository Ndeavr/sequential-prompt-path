/**
 * UNPRO — Email Configuration Checks Table
 */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, AlertTriangle, XCircle, Clock, CheckCircle } from "lucide-react";
import type { EmailCheck } from "@/hooks/useEmailHealthCenter";

interface Props {
  checks: EmailCheck[];
}

const STATUS_ICON: Record<string, { icon: typeof Shield; color: string }> = {
  passed: { icon: CheckCircle, color: "text-emerald-500" },
  failed: { icon: XCircle, color: "text-destructive" },
  warning: { icon: AlertTriangle, color: "text-amber-500" },
  pending: { icon: Clock, color: "text-muted-foreground" },
  needs_action: { icon: AlertTriangle, color: "text-orange-500" },
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive",
  high: "bg-orange-500/10 text-orange-600",
  medium: "bg-amber-500/10 text-amber-600",
  low: "bg-muted text-muted-foreground",
  info: "bg-muted text-muted-foreground",
};

const TableEmailConfigurationChecks = ({ checks }: Props) => {
  if (!checks.length) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Aucune vérification effectuée. Lancez un audit.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Statut</TableHead>
          <TableHead>Vérification</TableHead>
          <TableHead>Sévérité</TableHead>
          <TableHead className="hidden sm:table-cell">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {checks.map((c) => {
          const si = STATUS_ICON[c.status] || STATUS_ICON.pending;
          const Icon = si.icon;
          return (
            <TableRow key={c.id}>
              <TableCell>
                <Icon className={`h-4 w-4 ${si.color}`} />
              </TableCell>
              <TableCell>
                <div>
                  <p className="text-sm font-medium text-foreground">{c.message || c.check_key}</p>
                  {c.is_blocking && <span className="text-[10px] text-destructive font-medium">BLOQUANT</span>}
                </div>
              </TableCell>
              <TableCell>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${SEVERITY_BADGE[c.severity] || SEVERITY_BADGE.info}`}>
                  {c.severity}
                </span>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {c.recommended_action ? (
                  <p className="text-xs text-muted-foreground">{c.recommended_action}</p>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default TableEmailConfigurationChecks;
