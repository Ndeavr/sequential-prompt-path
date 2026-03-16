import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AutomationRun } from "@/services/automationService";

const statusStyle: Record<string, string> = {
  running: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  partial: "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

function duration(run: AutomationRun) {
  if (!run.run_started_at || !run.run_finished_at) return "—";
  const ms = new Date(run.run_finished_at).getTime() - new Date(run.run_started_at).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function AutomationRunHistory({ runs }: { runs: AutomationRun[] }) {
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="text-xs">Agent</TableHead>
            <TableHead className="text-xs hidden sm:table-cell">Décl.</TableHead>
            <TableHead className="text-xs">Statut</TableHead>
            <TableHead className="text-xs hidden md:table-cell">Durée</TableHead>
            <TableHead className="text-xs text-center">✓</TableHead>
            <TableHead className="text-xs text-center">✗</TableHead>
            <TableHead className="text-xs text-center hidden sm:table-cell">⊘</TableHead>
            <TableHead className="text-xs hidden lg:table-cell">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map(r => (
            <TableRow key={r.id}>
              <TableCell className="p-2 text-sm">{(r.agent as any)?.name ?? "—"}</TableCell>
              <TableCell className="p-2 text-xs hidden sm:table-cell text-muted-foreground">{r.triggered_by}</TableCell>
              <TableCell className="p-2">
                <Badge variant="outline" className={`text-[10px] ${statusStyle[r.status] ?? ""}`}>{r.status}</Badge>
              </TableCell>
              <TableCell className="p-2 text-xs hidden md:table-cell">{duration(r)}</TableCell>
              <TableCell className="p-2 text-xs text-center text-emerald-600">{r.jobs_succeeded}</TableCell>
              <TableCell className="p-2 text-xs text-center text-destructive">{r.jobs_failed}</TableCell>
              <TableCell className="p-2 text-xs text-center hidden sm:table-cell text-muted-foreground">{r.jobs_skipped}</TableCell>
              <TableCell className="p-2 text-xs hidden lg:table-cell text-muted-foreground">
                {r.created_at ? new Date(r.created_at).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" }) : "—"}
              </TableCell>
            </TableRow>
          ))}
          {runs.length === 0 && (
            <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">Aucun historique</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
