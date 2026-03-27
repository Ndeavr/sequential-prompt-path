import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, MessageSquare, Send, MousePointerClick, Eye, UserCheck, AlertTriangle, Plus, Play, Pause, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-blue-100 text-blue-800",
  running: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-primary/10 text-primary",
  failed: "bg-destructive/10 text-destructive",
};

export default function AdminOutreachDashboard() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState({ sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0, bounced: 0, unsubscribed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [campRes, msgRes, openRes, clickRes, unsubRes] = await Promise.all([
      supabase.from("outreach_campaigns").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("outreach_messages").select("message_status").limit(1000),
      supabase.from("outreach_open_events").select("id").limit(1000),
      supabase.from("outreach_click_events").select("id").limit(1000),
      supabase.from("outreach_unsubscribes").select("id").limit(1000),
    ]);
    if (campRes.data) setCampaigns(campRes.data);
    const msgs = msgRes.data || [];
    setStats({
      sent: msgs.filter(m => ["sent", "delivered", "opened", "clicked"].includes(m.message_status)).length,
      delivered: msgs.filter(m => ["delivered", "opened", "clicked"].includes(m.message_status)).length,
      opened: openRes.data?.length || 0,
      clicked: clickRes.data?.length || 0,
      converted: msgs.filter(m => m.message_status === "converted").length,
      bounced: msgs.filter(m => m.message_status === "bounced").length,
      unsubscribed: unsubRes.data?.length || 0,
    });
    setLoading(false);
  }

  const metricCards = [
    { label: "Envoyés", value: stats.sent, icon: Send, color: "text-blue-600" },
    { label: "Livrés", value: stats.delivered, icon: Mail, color: "text-green-600" },
    { label: "Ouvertures", value: stats.opened, icon: Eye, color: "text-purple-600" },
    { label: "Clics", value: stats.clicked, icon: MousePointerClick, color: "text-orange-600" },
    { label: "Conversions", value: stats.converted, icon: UserCheck, color: "text-emerald-600" },
    { label: "Bounces", value: stats.bounced, icon: AlertTriangle, color: "text-red-600" },
    { label: "Désabonnements", value: stats.unsubscribed, icon: MessageSquare, color: "text-muted-foreground" },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Moteur d'Outreach</h1>
          <p className="text-muted-foreground text-sm">Email & SMS — Campagnes, séquences, tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/outreach/analytics")}>
            <BarChart3 className="h-4 w-4 mr-1" /> Analytics
          </Button>
          <Button size="sm" onClick={() => navigate("/admin/outreach/templates")}>
            <Mail className="h-4 w-4 mr-1" /> Templates
          </Button>
          <Button size="sm" onClick={() => navigate("/admin/outreach/new")}>
            <Plus className="h-4 w-4 mr-1" /> Nouvelle campagne
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {metricCards.map(m => (
          <Card key={m.label} className="border-border/40">
            <CardContent className="p-4 text-center">
              <m.icon className={`h-5 w-5 mx-auto mb-1 ${m.color}`} />
              <div className="text-2xl font-bold">{m.value}</div>
              <div className="text-xs text-muted-foreground">{m.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaigns table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campagnes d'outreach</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Chargement…</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Aucune campagne d'outreach</p>
              <Button size="sm" className="mt-3" onClick={() => navigate("/admin/outreach/new")}>
                <Plus className="h-4 w-4 mr-1" /> Créer une campagne
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Limites</TableHead>
                  <TableHead>Créée</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map(c => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/admin/outreach/${c.id}`)}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {c.primary_channel === "email" ? <Mail className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                        {c.primary_channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${statusColors[c.status] || ""}`}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.hourly_send_limit}/h · {c.daily_send_limit}/j</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("fr-CA")}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">Détails →</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
