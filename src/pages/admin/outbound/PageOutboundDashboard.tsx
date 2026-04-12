import AdminLayout from "@/layouts/AdminLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Send, Mail, MessageSquare, AlertTriangle, CalendarCheck, TrendingUp,
  Plus, ArrowRight, Users, Target, Zap, BarChart3, Activity,
  Rocket, Search, Shield, Loader2
} from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-blue-500/20 text-blue-400",
  active: "bg-emerald-500/20 text-emerald-400",
  scraping: "bg-primary/20 text-primary",
  sending: "bg-primary/20 text-primary",
  paused: "bg-amber-500/20 text-amber-400",
  completed: "bg-primary/20 text-primary",
  error: "bg-red-500/20 text-red-400",
  archived: "bg-muted text-muted-foreground",
};

export default function PageOutboundDashboard() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [scrapingRuns, setScrapingRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [c, l, m, sr] = await Promise.all([
      supabase.from("outbound_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("outbound_leads").select("crm_status, qualification_status, sending_status, campaign_id, lead_score"),
      supabase.from("outbound_mailboxes").select("*"),
      supabase.from("outbound_scraping_runs").select("id, campaign_id, status, lead_created_count, started_at").order("started_at", { ascending: false }).limit(5),
    ]);
    setCampaigns(c.data || []);
    setLeads(l.data || []);
    setMailboxes(m.data || []);
    setScrapingRuns(sr.data || []);
    setLoading(false);
  }

  async function launchScraping(campaignId: string) {
    setLaunching(campaignId);
    try {
      const { data, error } = await supabase.functions.invoke("edge-start-scraping-run", {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      toast.success(`Scraping lancé ! ${data?.lead_created_count || 0} leads créés`);
      loadAll();
    } catch (err: any) {
      toast.error(err.message || "Erreur scraping");
    } finally {
      setLaunching(null);
    }
  }

  async function launchSending(campaignId: string) {
    setLaunching(campaignId);
    try {
      const { data, error } = await supabase.functions.invoke("edge-start-sending-run", {
        body: { campaign_id: campaignId, dry_run: false },
      });
      if (error) throw error;
      toast.success(`Envoi terminé ! ${data?.sent_count || 0} emails envoyés`);
      loadAll();
    } catch (err: any) {
      toast.error(err.message || "Erreur envoi");
    } finally {
      setLaunching(null);
    }
  }

  const qualStats = leads.reduce((acc, l) => {
    const qs = l.qualification_status || "raw";
    acc[qs] = (acc[qs] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sendStats = leads.reduce((acc, l) => {
    const ss = l.sending_status || "not_started";
    acc[ss] = (acc[ss] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    { label: "Leads total", value: leads.length, icon: Users, color: "text-blue-400" },
    { label: "Prêts", value: qualStats["ready_to_send"] || 0, icon: Target, color: "text-emerald-400" },
    { label: "En file", value: sendStats["queued"] || 0, icon: Send, color: "text-primary" },
    { label: "Envoyés", value: sendStats["sent"] || 0, icon: Mail, color: "text-primary" },
    { label: "Réponses", value: sendStats["replied"] || 0, icon: MessageSquare, color: "text-amber-400" },
    { label: "Scraping runs", value: scrapingRuns.length, icon: Search, color: "text-purple-400" },
  ];

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Rocket className="h-7 w-7 text-primary" /> Outbound Autonomous Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Pipeline automatisé : scraping → leads → envoi · go.unpro.ca</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("/admin/outbound/campaigns/new")} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" /> Nouvelle campagne
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/outbound/runs")}>
              <Activity className="h-4 w-4 mr-1" /> Runs
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/outbound/settings")}>
              <Shield className="h-4 w-4 mr-1" /> Settings
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pipeline Funnel */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Pipeline autonome</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "raw", label: "Brut", color: "bg-slate-500/20 text-slate-300" },
                { key: "validated", label: "Validé", color: "bg-blue-500/20 text-blue-300" },
                { key: "ready_to_send", label: "Prêt", color: "bg-emerald-500/20 text-emerald-300" },
                { key: "duplicate", label: "Dupliqué", color: "bg-amber-500/20 text-amber-300" },
                { key: "rejected", label: "Rejeté", color: "bg-red-500/20 text-red-300" },
              ].map(s => (
                <Badge key={s.key} variant="outline" className={`${s.color} text-xs px-3 py-1`}>
                  {s.label}: {qualStats[s.key] || 0}
                </Badge>
              ))}
              <span className="text-muted-foreground text-xs mx-2">→</span>
              {[
                { key: "not_started", label: "Non démarré", color: "bg-muted text-muted-foreground" },
                { key: "queued", label: "En file", color: "bg-blue-500/20 text-blue-300" },
                { key: "sent", label: "Envoyé", color: "bg-emerald-500/20 text-emerald-300" },
                { key: "replied", label: "Répondu", color: "bg-amber-500/20 text-amber-300" },
                { key: "suppressed", label: "Supprimé", color: "bg-red-500/20 text-red-300" },
              ].map(s => (
                <Badge key={s.key} variant="outline" className={`${s.color} text-xs px-3 py-1`}>
                  {s.label}: {sendStats[s.key] || 0}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Campaigns with Actions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Campagnes</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/outbound/campaigns")}>
                Voir tout <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Chargement…</p>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-3">Aucune campagne. Lancez votre première acquisition.</p>
                <Button onClick={() => navigate("/admin/outbound/campaigns/new")}>
                  <Plus className="h-4 w-4 mr-1" /> Créer une campagne
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campagne</TableHead>
                      <TableHead>Ville</TableHead>
                      <TableHead>Spécialité</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.slice(0, 8).map(c => {
                      const campLeads = leads.filter(l => l.campaign_id === c.id).length;
                      const isLaunching = launching === c.id;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.campaign_name}</TableCell>
                          <TableCell>{c.city}</TableCell>
                          <TableCell>{c.specialty}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[c.campaign_status] || ""} variant="outline">
                              {c.campaign_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{campLeads}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {["draft", "ready"].includes(c.campaign_status) && (
                                <Button variant="outline" size="sm" disabled={isLaunching} onClick={() => launchScraping(c.id)}>
                                  {isLaunching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}
                                  Scraper
                                </Button>
                              )}
                              {["ready", "active"].includes(c.campaign_status) && campLeads > 0 && (
                                <Button variant="outline" size="sm" disabled={isLaunching} onClick={() => launchSending(c.id)}>
                                  {isLaunching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                                  Envoyer
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Scraping Runs */}
        {scrapingRuns.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" /> Scraping récent</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {scrapingRuns.map(r => (
                  <div key={r.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={
                        r.status === "completed" ? "bg-emerald-500/20 text-emerald-400" :
                        r.status === "running" ? "bg-primary/20 text-primary" :
                        "bg-muted text-muted-foreground"
                      }>{r.status}</Badge>
                      <span className="text-sm">{r.lead_created_count || 0} leads créés</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {r.started_at ? new Date(r.started_at).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mailbox Health */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Santé Mailboxes</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {mailboxes.map(m => (
                <div key={m.id} className="border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{m.sender_name}</span>
                    <Badge variant="outline" className={
                      m.mailbox_status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                      m.mailbox_status === "warmup" ? "bg-amber-500/20 text-amber-400" :
                      "bg-red-500/20 text-red-400"
                    }>{m.mailbox_status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{m.sender_email}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span>Health: <strong className={(m.health_score || 0) >= 80 ? "text-emerald-400" : (m.health_score || 0) >= 50 ? "text-amber-400" : "text-red-400"}>{m.health_score}%</strong></span>
                    <span>Envoyés: {(m as any).sent_today || 0}/{m.daily_limit}/jour</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Leads Pipeline", icon: Users, path: "/admin/outbound/leads" },
            { label: "Campagnes", icon: Target, path: "/admin/outbound/campaigns" },
            { label: "Séquences", icon: Mail, path: "/admin/outbound/sequences" },
            { label: "Run Monitor", icon: Activity, path: "/admin/outbound/runs" },
            { label: "Mailboxes", icon: Send, path: "/admin/outbound/mailboxes" },
            { label: "Suppressions", icon: AlertTriangle, path: "/admin/outbound/suppressions" },
            { label: "Analytics", icon: BarChart3, path: "/admin/outbound/analytics" },
            { label: "Settings", icon: Shield, path: "/admin/outbound/settings" },
          ].map(l => (
            <Card key={l.label} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(l.path)}>
              <CardContent className="p-4 flex items-center gap-3">
                <l.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{l.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
