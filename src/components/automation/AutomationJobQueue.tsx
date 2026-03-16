import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, CheckCircle2, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import type { AutomationJob } from "@/services/automationService";
import { generatePromptExport } from "@/services/automationService";

const statusStyles: Record<string, string> = {
  queued: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  running: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  skipped: "bg-muted text-muted-foreground border-border",
  needs_review: "bg-purple-500/10 text-purple-600 border-purple-500/30",
};

interface Props {
  jobs: AutomationJob[];
  statusFilter: string;
  onFilterChange: (s: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export default function AutomationJobQueue({ jobs, statusFilter, onFilterChange, onApprove, onReject }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function copyPrompt(job: AutomationJob) {
    navigator.clipboard.writeText(generatePromptExport(job));
    toast.success("Prompt copié");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="queued">En attente</SelectItem>
            <SelectItem value="running">En cours</SelectItem>
            <SelectItem value="completed">Complétés</SelectItem>
            <SelectItem value="failed">Échoués</SelectItem>
            <SelectItem value="needs_review">À réviser</SelectItem>
            <SelectItem value="skipped">Ignorés</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{jobs.length} jobs</span>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Titre</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">Agent</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Type</TableHead>
              <TableHead className="text-xs">Statut</TableHead>
              <TableHead className="text-xs hidden lg:table-cell">Prio</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map(j => (
              <TableRow key={j.id}>
                <TableCell className="p-2 text-sm max-w-[200px] truncate">{j.title ?? j.job_type ?? "—"}</TableCell>
                <TableCell className="p-2 text-xs hidden sm:table-cell text-muted-foreground">{(j.agent as any)?.name ?? "—"}</TableCell>
                <TableCell className="p-2 text-xs hidden md:table-cell font-mono">{j.job_type ?? "—"}</TableCell>
                <TableCell className="p-2">
                  <Badge variant="outline" className={`text-[10px] ${statusStyles[j.status] ?? ""}`}>{j.status}</Badge>
                </TableCell>
                <TableCell className="p-2 text-xs hidden lg:table-cell">{j.priority}</TableCell>
                <TableCell className="p-2 text-right space-x-1">
                  {j.status === "needs_review" && onApprove && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => onApprove(j.id)}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onReject?.(j.id)}><XCircle className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyPrompt(j)}><Copy className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {jobs.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Aucun job</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
