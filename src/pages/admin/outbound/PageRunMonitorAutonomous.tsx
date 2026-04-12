import AdminLayout from "@/layouts/AdminLayout";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Activity, Loader2, CheckCircle2, XCircle, Pause,
  Clock, Send, Search, AlertTriangle, RefreshCcw
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const runStatusConfig: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: "En attente", icon: Clock, className: "bg-blue-500/20 text-blue-400" },
  running: { label: "En cours", icon: Loader2, className: "bg-primary/20 text-primary" },
  completed: { label: "Terminé", icon: CheckCircle2, className: "bg-emerald-500/20 text-emerald-400" },
  failed: { label: "Échoué", icon: XCircle, className: "bg-red-500/20 text-red-400" },
  paused: { label: "Pausé", icon: Pause, className: "bg-amber-500/20 text-amber-400" },
};

export default function PageRunMonitorAutonomous() {
  const navigate = useNavigate();

  const { data: scrapingRuns, isLoading: loadingScraping, refetch: refetchScraping } = useQuery({
    queryKey: ["scraping-runs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("outbound_scraping_runs")
        .select("*, outbound_campaigns(campaign_name, city, specialty)")
        .order("started_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: sendingRuns, isLoading: loadingSending, refetch: refetchSending } = useQuery({
    queryKey: ["sending-runs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("outbound_sending_runs")
        .select("*, outbound_campaigns(campaign_name), outbound_mailboxes(sender_email)")
        .order("started_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns-status"],
    queryFn: async () => {
      const { data } = await supabase
        .from("outbound_campaigns")
        .select("id, campaign_name, campaign_status, city, specialty")
        .in("campaign_status", ["scraping", "sending", "paused", "error"]);
      return data || [];
    },
  });

  const { data: mailboxes } = useQuery({
    queryKey: ["mailboxes-health"],
    queryFn: async () => {
      const { data } = await supabase
        .from("outbound_mailboxes")
        .select("id, sender_email, mailbox_status, health_score, sent_today, daily_limit");
      return data || [];
    },
  });

  const { data: leadStats } = useQuery({
    queryKey: ["lead-pipeline-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("outbound_leads")
        .select("qualification_status, sending_status");
      const qs: Record<string, number> = {};
      const ss: Record<string, number> = {};
      (data || []).forEach(l => {
        qs[l.qualification_status || "raw"] = (qs[l.qualification_status || "raw"] || 0) + 1;
        ss[l.sending_status || "not_started"] = (ss[l.sending_status || "not_started"] || 0) + 1;
      });
      return { qualification: qs, sending: ss, total: (data || []).length };
    },
  });

  function StatusBadge({ status }: { status: string }) {
    const cfg = runStatusConfig[status] || runStatusConfig.pending;
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={`${cfg.className} text-xs`}>
        <Icon className={`h-3 w-3 mr-1 ${status === "running" ? "animate-spin" : ""}`} />
        {cfg.label}
      </Badge>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/outbound")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" /> Run Monitor
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Suivi en temps réel des scraping & sending runs</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetchScraping(); refetchSending(); }}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Rafraîchir
          </Button>
        </div>

        {/* Pipeline Health Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{leadStats?.total || 0}</div>
              <div className="text-xs text-muted-foreground">Leads total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{leadStats?.qualification?.ready_to_send || 0}</div>
              <div className="text-xs text-muted-foreground">Prêts à envoyer</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{leadStats?.sending?.queued || 0}</div>
              <div className="text-xs text-muted-foreground">En file</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{leadStats?.sending?.sent || 0}</div>
              <div className="text-xs text-muted-foreground">Envoyés</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{leadStats?.sending?.replied || 0}</div>
              <div className="text-xs text-muted-foreground">Réponses</div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Status */}
        {(campaigns || []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Campagnes actives / en erreur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(campaigns || []).map(c => (
                  <Badge key={c.id} variant="outline" className={
                    c.campaign_status === "error" ? "bg-red-500/20 text-red-400" :
                    c.campaign_status === "paused" ? "bg-amber-500/20 text-amber-400" :
                    "bg-primary/20 text-primary"
                  }>
                    {c.campaign_name} · {c.city} · {c.campaign_status}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mailbox Health */}
        <Card>
          <CardHeader><CardTitle className="text-base">Santé Mailboxes</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(mailboxes || []).map(m => (
                <div key={m.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{m.sender_email}</span>
                    <Badge variant="outline" className={
                      m.mailbox_status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                      "bg-amber-500/20 text-amber-400"
                    }>{m.mailbox_status}</Badge>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Envoyés: {m.sent_today || 0}/{m.daily_limit}</span>
                    <span className={
                      (m.health_score || 0) >= 80 ? "text-emerald-400" :
                      (m.health_score || 0) >= 50 ? "text-amber-400" : "text-red-400"
                    }>Health: {m.health_score || 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Scraping Runs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" /> Scraping Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingScraping ? (
              <p className="text-center py-8 text-muted-foreground">Chargement…</p>
            ) : (scrapingRuns || []).length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Aucun run de scraping</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campagne</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Brut</TableHead>
                      <TableHead className="text-right">Valide</TableHead>
                      <TableHead className="text-right">Dédupliqué</TableHead>
                      <TableHead className="text-right">Leads créés</TableHead>
                      <TableHead className="text-right">Erreurs</TableHead>
                      <TableHead>Démarré</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(scrapingRuns || []).map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.outbound_campaigns?.campaign_name || "—"}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-right">{r.raw_entity_count}</TableCell>
                        <TableCell className="text-right">{r.valid_entity_count}</TableCell>
                        <TableCell className="text-right">{r.deduplicated_count}</TableCell>
                        <TableCell className="text-right text-emerald-400">{r.lead_created_count}</TableCell>
                        <TableCell className="text-right text-red-400">{r.error_count}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.started_at ? new Date(r.started_at).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" }) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sending Runs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4" /> Sending Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSending ? (
              <p className="text-center py-8 text-muted-foreground">Chargement…</p>
            ) : (sendingRuns || []).length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Aucun run d'envoi</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campagne</TableHead>
                      <TableHead>Mailbox</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">File</TableHead>
                      <TableHead className="text-right">Envoyés</TableHead>
                      <TableHead className="text-right">Ignorés</TableHead>
                      <TableHead className="text-right">Erreurs</TableHead>
                      <TableHead>Démarré</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sendingRuns || []).map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.outbound_campaigns?.campaign_name || "—"}</TableCell>
                        <TableCell className="text-xs">{r.outbound_mailboxes?.sender_email || "—"}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-right">{r.queued_count}</TableCell>
                        <TableCell className="text-right text-emerald-400">{r.sent_count}</TableCell>
                        <TableCell className="text-right">{r.skipped_count}</TableCell>
                        <TableCell className="text-right text-red-400">{r.error_count}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.started_at ? new Date(r.started_at).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" }) : "—"}
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
    </AdminLayout>
  );
}
