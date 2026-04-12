import AdminLayout from "@/layouts/AdminLayout";
import { useState } from "react";
import { ScrollText, Filter, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import BadgePipelineState from "@/components/admin/outbound-ops/BadgePipelineState";
import { usePipelineLogs } from "@/hooks/useOutboundOpsData";

const logTypeColors: Record<string, string> = {
  info: "text-blue-400",
  warning: "text-amber-400",
  error: "text-red-400",
  success: "text-emerald-400",
};

export default function PageOutboundLogs() {
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: logs, refetch } = usePipelineLogs(100, {
    source_module: sourceFilter || undefined,
    status: statusFilter || undefined,
  });

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10"><ScrollText className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-lg font-bold font-display">Logs Pipeline</h1>
            <p className="text-xs text-muted-foreground">Événements et traces d'exécution</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-3 w-3" /> Rafraîchir
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={sourceFilter} onValueChange={v => setSourceFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Source module" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="scraping">Scraping</SelectItem>
            <SelectItem value="enrichment">Enrichissement</SelectItem>
            <SelectItem value="aipp_scoring">AIPP</SelectItem>
            <SelectItem value="email_generation">Email génération</SelectItem>
            <SelectItem value="email_send">Email envoi</SelectItem>
            <SelectItem value="reply_classification">Réponses</SelectItem>
            <SelectItem value="full_pipeline">Pipeline complet</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="success">Succès</SelectItem>
            <SelectItem value="error">Erreur</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="queued">En file</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="hidden md:table-cell">Statut</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map(log => (
                <TableRow key={log.id}>
                  <TableCell><span className={`text-xs font-mono ${logTypeColors[log.log_type] || "text-muted-foreground"}`}>{log.log_type.toUpperCase()}</span></TableCell>
                  <TableCell className="text-xs">{log.source_module}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{log.message}</TableCell>
                  <TableCell className="hidden md:table-cell">{log.status && <BadgePipelineState state={log.status} />}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("fr-CA")}</TableCell>
                </TableRow>
              ))}
              {!logs?.length && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucun log</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </AdminLayout>
  );
}
