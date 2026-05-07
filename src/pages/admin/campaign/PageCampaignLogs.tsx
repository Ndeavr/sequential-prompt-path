import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/layouts/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, RefreshCw, ScrollText, Send, Search, Bug } from "lucide-react";

type SendLog = {
  id: string;
  campaign_contact_id: string | null;
  company_name: string | null;
  day: string;
  channel: string;
  status: string;
  provider_id: string | null;
  error_message: string | null;
  metadata: any;
  sent_at: string;
};

type PipelineLog = {
  id: string;
  log_type: string;
  source_module: string;
  entity_type: string | null;
  entity_id: string | null;
  status: string | null;
  message: string;
  payload: any;
  created_at: string;
};

const STATUS_COLOR: Record<string, string> = {
  sent: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  opened: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  clicked: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  replied: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  queued: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  failed: "bg-red-500/15 text-red-300 border-red-500/30",
  bounced: "bg-red-500/15 text-red-300 border-red-500/30",
  error: "bg-red-500/15 text-red-300 border-red-500/30",
  warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  info: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

function StatusBadge({ value }: { value: string }) {
  return (
    <Badge variant="outline" className={STATUS_COLOR[value] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30"}>
      {value}
    </Badge>
  );
}

export default function PageCampaignLogs() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [detail, setDetail] = useState<SendLog | PipelineLog | null>(null);

  const sendLogsQ = useQuery({
    queryKey: ["campaign-send-logs", statusFilter, channelFilter],
    queryFn: async () => {
      let q = supabase.from("campaign_send_log").select("*").order("sent_at", { ascending: false }).limit(300);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (channelFilter !== "all") q = q.eq("channel", channelFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SendLog[];
    },
    refetchInterval: 15_000,
  });

  const pipelineLogsQ = useQuery({
    queryKey: ["campaign-pipeline-logs", sourceFilter],
    queryFn: async () => {
      let q = supabase
        .from("pipeline_logs")
        .select("*")
        .in("source_module", ["scraping", "scrape-qc-exterior-trades", "campaign-agent-loop", "email_send", "sms_send", "full_pipeline"])
        .order("created_at", { ascending: false })
        .limit(300);
      if (sourceFilter !== "all") q = q.eq("source_module", sourceFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PipelineLog[];
    },
    refetchInterval: 15_000,
  });

  const stats = useMemo(() => {
    const logs = sendLogsQ.data ?? [];
    const failures = logs.filter((l) => l.status === "failed" || l.status === "bounced");
    const sent = logs.filter((l) => ["sent", "delivered", "opened", "clicked", "replied"].includes(l.status));
    const retries = logs.filter((l) => (l.metadata as any)?.retry_count > 0).length;
    return {
      total: logs.length,
      sent: sent.length,
      failures: failures.length,
      retries,
      failureRate: logs.length ? Math.round((failures.length / logs.length) * 100) : 0,
    };
  }, [sendLogsQ.data]);

  const filteredSends = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sendLogsQ.data ?? [];
    return (sendLogsQ.data ?? []).filter(
      (l) =>
        l.company_name?.toLowerCase().includes(q) ||
        l.error_message?.toLowerCase().includes(q) ||
        l.provider_id?.toLowerCase().includes(q)
    );
  }, [sendLogsQ.data, search]);

  const filteredPipeline = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pipelineLogsQ.data ?? [];
    return (pipelineLogsQ.data ?? []).filter(
      (l) => l.message?.toLowerCase().includes(q) || l.source_module?.toLowerCase().includes(q)
    );
  }, [pipelineLogsQ.data, search]);

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Bug className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display">Logs Campagne & Diagnostics</h1>
              <p className="text-xs text-muted-foreground">Échecs, retrys et événements pipeline en temps réel</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              sendLogsQ.refetch();
              pipelineLogsQ.refetch();
            }}
            className="gap-1.5"
          >
            <RefreshCw className="h-3 w-3" /> Rafraîchir
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Envois (300 récents)" value={stats.total} />
          <KpiCard label="Succès" value={stats.sent} tone="success" />
          <KpiCard label="Échecs" value={stats.failures} tone="error" />
          <KpiCard label="Taux échec" value={`${stats.failureRate}%`} tone={stats.failureRate > 10 ? "error" : "neutral"} />
          <KpiCard label="Retrys" value={stats.retries} tone="warning" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Recherche entreprise, erreur, source…"
              className="h-9 pl-8 text-xs"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="sent">sent</SelectItem>
              <SelectItem value="failed">failed</SelectItem>
              <SelectItem value="bounced">bounced</SelectItem>
              <SelectItem value="queued">queued</SelectItem>
              <SelectItem value="opened">opened</SelectItem>
              <SelectItem value="clicked">clicked</SelectItem>
              <SelectItem value="replied">replied</SelectItem>
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-32 h-9 text-xs"><SelectValue placeholder="Canal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous canaux</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-44 h-9 text-xs"><SelectValue placeholder="Source pipeline" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes sources</SelectItem>
              <SelectItem value="scraping">scraping</SelectItem>
              <SelectItem value="scrape-qc-exterior-trades">scrape-qc-exterior-trades</SelectItem>
              <SelectItem value="campaign-agent-loop">campaign-agent-loop</SelectItem>
              <SelectItem value="email_send">email_send</SelectItem>
              <SelectItem value="sms_send">sms_send</SelectItem>
              <SelectItem value="full_pipeline">full_pipeline</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="sends" className="space-y-3">
          <TabsList>
            <TabsTrigger value="sends" className="gap-1.5"><Send className="h-3 w-3" />Envois</TabsTrigger>
            <TabsTrigger value="failures" className="gap-1.5"><AlertTriangle className="h-3 w-3" />Échecs uniquement</TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-1.5"><ScrollText className="h-3 w-3" />Pipeline (scraper)</TabsTrigger>
          </TabsList>

          <TabsContent value="sends">
            <SendsTable rows={filteredSends} onRow={(r) => setDetail(r)} />
          </TabsContent>
          <TabsContent value="failures">
            <SendsTable
              rows={filteredSends.filter((r) => r.status === "failed" || r.status === "bounced")}
              onRow={(r) => setDetail(r)}
            />
          </TabsContent>
          <TabsContent value="pipeline">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="text-right">Quand</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPipeline.map((l) => (
                      <TableRow key={l.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetail(l)}>
                        <TableCell><StatusBadge value={l.log_type} /></TableCell>
                        <TableCell className="text-xs font-mono">{l.source_module}</TableCell>
                        <TableCell>{l.status && <StatusBadge value={l.status} />}</TableCell>
                        <TableCell className="text-xs max-w-md truncate">{l.message}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {new Date(l.created_at).toLocaleString("fr-CA")}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!filteredPipeline.length && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">Aucun log pipeline</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détail de l'événement</DialogTitle>
            </DialogHeader>
            {detail && (
              <div className="space-y-3 text-xs">
                {"error_message" in detail && detail.error_message && (
                  <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3">
                    <div className="font-semibold text-red-300 mb-1">Erreur</div>
                    <div className="font-mono whitespace-pre-wrap">{detail.error_message}</div>
                  </div>
                )}
                <pre className="bg-muted/40 p-3 rounded-md overflow-auto text-[11px] font-mono">
                  {JSON.stringify(detail, null, 2)}
                </pre>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

function KpiCard({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "neutral" | "success" | "error" | "warning" }) {
  const toneCls = {
    neutral: "text-foreground",
    success: "text-emerald-400",
    error: "text-red-400",
    warning: "text-amber-400",
  }[tone];
  return (
    <Card>
      <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</CardTitle></CardHeader>
      <CardContent className="pt-0 pb-3 px-3"><div className={`text-2xl font-bold tabular-nums ${toneCls}`}>{value}</div></CardContent>
    </Card>
  );
}

function SendsTable({ rows, onRow }: { rows: SendLog[]; onRow: (r: SendLog) => void }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entreprise</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Jour</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Erreur</TableHead>
              <TableHead className="text-right">Envoyé</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => onRow(r)}>
                <TableCell className="text-xs font-medium max-w-[180px] truncate">{r.company_name || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{r.channel}</Badge></TableCell>
                <TableCell className="text-xs font-mono">{r.day}</TableCell>
                <TableCell><StatusBadge value={r.status} /></TableCell>
                <TableCell className="text-xs text-red-300 max-w-xs truncate">{r.error_message || "—"}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{new Date(r.sent_at).toLocaleString("fr-CA")}</TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">Aucun envoi</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
