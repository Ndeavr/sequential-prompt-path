import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Send, Mail, Eye, MousePointerClick, MessageSquare, AlertTriangle,
  CalendarCheck, TrendingUp, Plus, ArrowRight, Users, Building2,
  Target, Zap, BarChart3
} from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-blue-500/20 text-blue-400",
  active: "bg-emerald-500/20 text-emerald-400",
  paused: "bg-amber-500/20 text-amber-400",
  completed: "bg-primary/20 text-primary",
  archived: "bg-muted text-muted-foreground",
};

export default function PageOutboundDashboard() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [c, l, m] = await Promise.all([
      supabase.from("outbound_campaigns").select("*").order("priority_index"),
      supabase.from("outbound_leads").select("crm_status, total_priority_score, campaign_id"),
      supabase.from("outbound_mailboxes").select("*"),
    ]);
    setCampaigns(c.data || []);
    setLeads(l.data || []);
    setMailboxes(m.data || []);
    setLoading(false);
  }

  const statusCounts = leads.reduce((acc, l) => {
    acc[l.crm_status] = (acc[l.crm_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    { label: "Leads total", value: leads.length, icon: Users, color: "text-blue-400" },
    { label: "En séquence", value: statusCounts["in_sequence"] || 0, icon: Send, color: "text-emerald-400" },
    { label: "Réponses +", value: (statusCounts["replied_positive"] || 0) + (statusCounts["replied_neutral"] || 0), icon: MessageSquare, color: "text-amber-400" },
    { label: "Meetings", value: statusCounts["meeting_booked"] || 0, icon: CalendarCheck, color: "text-purple-400" },
    { label: "Convertis", value: statusCounts["converted"] || 0, icon: TrendingUp, color: "text-emerald-400" },
    { label: "Bounced", value: statusCounts["bounced"] || 0, icon: AlertTriangle, color: "text-red-400" },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Outbound CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">Acquisition B2B par ville × spécialité · go.unpro.ca</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/outbound/leads")}>
            <Users className="h-4 w-4 mr-1" /> Leads
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/outbound/campaigns")}>
            <Target className="h-4 w-4 mr-1" /> Campagnes
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/outbound/sequences")}>
            <Mail className="h-4 w-4 mr-1" /> Séquences
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/outbound/mailboxes")}>
            <Send className="h-4 w-4 mr-1" /> Mailboxes
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/outbound/analytics")}>
            <BarChart3 className="h-4 w-4 mr-1" /> Analytics
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/outbound/suppressions")}>
            <AlertTriangle className="h-4 w-4 mr-1" /> Suppressions
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/outbound/landing-pages")}>
            <Zap className="h-4 w-4 mr-1" /> Landing Pages
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
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Pipeline CRM</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "new", label: "Nouveau", color: "bg-slate-500/20 text-slate-300" },
              { key: "imported", label: "Importé", color: "bg-blue-500/20 text-blue-300" },
              { key: "enriched", label: "Enrichi", color: "bg-cyan-500/20 text-cyan-300" },
              { key: "scored", label: "Scoré", color: "bg-indigo-500/20 text-indigo-300" },
              { key: "approved_to_send", label: "Approuvé", color: "bg-violet-500/20 text-violet-300" },
              { key: "in_sequence", label: "En séquence", color: "bg-emerald-500/20 text-emerald-300" },
              { key: "replied_positive", label: "Réponse +", color: "bg-green-500/20 text-green-300" },
              { key: "replied_neutral", label: "Neutre", color: "bg-amber-500/20 text-amber-300" },
              { key: "replied_negative", label: "Réponse −", color: "bg-orange-500/20 text-orange-300" },
              { key: "meeting_booked", label: "Meeting", color: "bg-purple-500/20 text-purple-300" },
              { key: "converted", label: "Converti", color: "bg-emerald-500/20 text-emerald-300" },
              { key: "bounced", label: "Bounced", color: "bg-red-500/20 text-red-300" },
              { key: "unsubscribed", label: "Unsub", color: "bg-red-500/20 text-red-300" },
              { key: "suppressed", label: "Supprimé", color: "bg-muted text-muted-foreground" },
              { key: "closed_lost", label: "Fermé", color: "bg-muted text-muted-foreground" },
            ].map(s => (
              <Badge key={s.key} variant="outline" className={`${s.color} text-xs px-3 py-1`}>
                {s.label}: {statusCounts[s.key] || 0}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Campagnes actives</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/outbound/campaigns")}>
            Voir tout <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Chargement…</p>
          ) : campaigns.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Aucune campagne. Créez-en une pour commencer.</p>
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
                    <TableHead className="text-right">Limite/jour</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map(c => {
                    const campLeads = leads.filter(l => l.campaign_id === c.id).length;
                    return (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/admin/outbound/campaigns`)}>
                        <TableCell className="font-medium">{c.campaign_name}</TableCell>
                        <TableCell>{c.city}</TableCell>
                        <TableCell>{c.specialty}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[c.campaign_status] || ""} variant="outline">
                            {c.campaign_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{campLeads}</TableCell>
                        <TableCell className="text-right">{c.daily_send_limit}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
                  <span>Health: <strong className={m.health_score >= 80 ? "text-emerald-400" : m.health_score >= 50 ? "text-amber-400" : "text-red-400"}>{m.health_score}%</strong></span>
                  <span>Limite: {m.daily_limit}/jour</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Leads Queue", icon: Users, path: "/admin/outbound/leads" },
          { label: "Campagnes", icon: Target, path: "/admin/outbound/campaigns" },
          { label: "Séquences", icon: Mail, path: "/admin/outbound/campaigns" },
          { label: "Analytics", icon: BarChart3, path: "/admin/outbound/campaigns" },
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
  );
}
