import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, CheckCircle, XCircle, SkipForward } from "lucide-react";

interface Props {
  campaignId?: string;
}

export default function PanelSendLogs({ campaignId }: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [campaignId]);

  async function load() {
    setLoading(true);
    let q = supabase
      .from("outbound_send_logs")
      .select("*")
      .order("run_at", { ascending: false })
      .limit(25);
    if (campaignId) q = q.eq("campaign_id", campaignId);
    const { data } = await q;
    setLogs(data || []);
    setLoading(false);
  }

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Historique d'envoi automatique
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-xs text-muted-foreground py-4 text-center animate-pulse">Chargement…</p>
        ) : logs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Aucun envoi automatique</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs text-right">Envoyés</TableHead>
                  <TableHead className="text-xs text-right">Échoués</TableHead>
                  <TableHead className="text-xs text-right">Ignorés</TableHead>
                  <TableHead className="text-xs text-right">Durée</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      {new Date(log.run_at).toLocaleString("fr-CA", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      <span className="flex items-center justify-end gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-400" />
                        {log.emails_sent}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      <span className="flex items-center justify-end gap-1">
                        <XCircle className="h-3 w-3 text-red-400" />
                        {log.emails_failed}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      <span className="flex items-center justify-end gap-1">
                        <SkipForward className="h-3 w-3 text-amber-400" />
                        {log.emails_skipped}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">
                      {log.run_duration_ms ? `${(log.run_duration_ms / 1000).toFixed(1)}s` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          log.run_status === "completed"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {log.run_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
