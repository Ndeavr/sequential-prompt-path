/**
 * UNPRO — Admin Email Logs Dashboard
 * Deduplicated view of email_send_log with filters and stats.
 */
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw } from "lucide-react";

type EmailLog = {
  id: string;
  message_id: string;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-green-500/15 text-green-700 border-green-200",
  pending: "bg-yellow-500/15 text-yellow-700 border-yellow-200",
  failed: "bg-destructive/15 text-destructive border-destructive/20",
  dlq: "bg-destructive/15 text-destructive border-destructive/20",
  suppressed: "bg-muted text-muted-foreground border-border",
  bounced: "bg-orange-500/15 text-orange-700 border-orange-200",
  complained: "bg-orange-500/15 text-orange-700 border-orange-200",
};

const TIME_RANGES = [
  { label: "24h", hours: 24 },
  { label: "7 jours", hours: 168 },
  { label: "30 jours", hours: 720 },
];

export default function PageAdminEmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(168); // 7 days default
  const [templateFilter, setTemplateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchLogs = async () => {
    setLoading(true);
    const since = new Date(Date.now() - timeRange * 3600 * 1000).toISOString();

    const { data, error } = await supabase
      .from("email_send_log")
      .select("id, message_id, template_name, recipient_email, status, error_message, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    if (!error && data) {
      // Deduplicate by message_id — keep latest row per message
      const deduped = new Map<string, EmailLog>();
      for (const row of data as EmailLog[]) {
        const key = row.message_id || row.id;
        if (!deduped.has(key)) {
          deduped.set(key, row);
        }
      }
      setLogs(Array.from(deduped.values()));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [timeRange]);

  // Get unique template names
  const templateNames = useMemo(() => {
    const names = new Set(logs.map((l) => l.template_name).filter(Boolean));
    return Array.from(names).sort();
  }, [logs]);

  // Filtered logs
  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (templateFilter !== "all" && l.template_name !== templateFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      return true;
    });
  }, [logs, templateFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const s = { total: filtered.length, sent: 0, failed: 0, suppressed: 0, pending: 0 };
    for (const l of filtered) {
      if (l.status === "sent") s.sent++;
      else if (l.status === "failed" || l.status === "dlq") s.failed++;
      else if (l.status === "suppressed") s.suppressed++;
      else if (l.status === "pending") s.pending++;
    }
    return s;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Mail className="w-6 h-6 text-primary" /> Emails
            </h1>
            <p className="text-sm text-muted-foreground">Suivi des emails transactionnels</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {TIME_RANGES.map((r) => (
            <Button
              key={r.hours}
              variant={timeRange === r.hours ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(r.hours)}
            >
              {r.label}
            </Button>
          ))}
          <Select value={templateFilter} onValueChange={setTemplateFilter}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="Tous les templates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les templates</SelectItem>
              {templateNames.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Tous statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="sent">Envoyé</SelectItem>
              <SelectItem value="failed">Échoué</SelectItem>
              <SelectItem value="suppressed">Supprimé</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-black text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-black text-green-600">{stats.sent}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3" /> Envoyés
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-black text-destructive">{stats.failed}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <XCircle className="w-3 h-3" /> Échoués
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-black text-yellow-600">{stats.suppressed + stats.pending}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Autres
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {filtered.length} email{filtered.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Aucun email trouvé pour cette période.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Template</TableHead>
                      <TableHead className="text-xs">Destinataire</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Erreur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 50).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs font-medium">{log.template_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {log.recipient_email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${STATUS_COLORS[log.status] || ""}`}
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("fr-CA", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                          {log.error_message || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
