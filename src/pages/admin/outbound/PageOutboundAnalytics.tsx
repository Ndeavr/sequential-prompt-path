import AdminLayout from "@/layouts/AdminLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Eye, MousePointerClick, MessageSquare, AlertTriangle, CalendarCheck, TrendingUp, Users, Target, BarChart3 } from "lucide-react";

export default function PageOutboundAnalytics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({});
  const [byCampaign, setByCampaign] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [leadsRes, msgsRes, evtsRes, campRes] = await Promise.all([
      supabase.from("outbound_leads").select("crm_status"),
      supabase.from("outbound_messages").select("delivery_status, open_count, click_count, replied"),
      supabase.from("outbound_events").select("event_type"),
      supabase.from("outbound_campaigns").select("id, campaign_name, city, specialty, campaign_status"),
    ]);

    const leads = leadsRes.data || [];
    const msgs = msgsRes.data || [];
    const evts = evtsRes.data || [];

    const totalLeads = leads.length;
    const totalSent = msgs.length;
    const totalOpened = msgs.filter(m => (m.open_count || 0) > 0).length;
    const totalClicked = msgs.filter(m => (m.click_count || 0) > 0).length;
    const totalReplied = msgs.filter(m => m.replied).length;
    const totalBounced = msgs.filter(m => m.delivery_status === "bounced").length;
    const meetingsBooked = leads.filter(l => l.crm_status === "meeting_booked").length;
    const converted = leads.filter(l => l.crm_status === "converted").length;
    const unsubscribed = leads.filter(l => l.crm_status === "unsubscribed").length;

    setStats({
      totalLeads, totalSent, totalOpened, totalClicked, totalReplied,
      totalBounced, meetingsBooked, converted, unsubscribed,
      openRate: totalSent ? ((totalOpened / totalSent) * 100).toFixed(1) : "0",
      clickRate: totalSent ? ((totalClicked / totalSent) * 100).toFixed(1) : "0",
      replyRate: totalSent ? ((totalReplied / totalSent) * 100).toFixed(1) : "0",
      bounceRate: totalSent ? ((totalBounced / totalSent) * 100).toFixed(1) : "0",
    });

    setByCampaign(campRes.data || []);
    setLoading(false);
  }

  const metrics = [
    { label: "Leads", value: stats.totalLeads, icon: Users, color: "text-blue-400" },
    { label: "Envoyés", value: stats.totalSent, icon: Send, color: "text-indigo-400" },
    { label: "Ouvertures", value: `${stats.openRate}%`, icon: Eye, color: "text-purple-400" },
    { label: "Clics", value: `${stats.clickRate}%`, icon: MousePointerClick, color: "text-orange-400" },
    { label: "Réponses", value: `${stats.replyRate}%`, icon: MessageSquare, color: "text-cyan-400" },
    { label: "Bounces", value: `${stats.bounceRate}%`, icon: AlertTriangle, color: "text-red-400" },
    { label: "RDV", value: stats.meetingsBooked, icon: CalendarCheck, color: "text-emerald-400" },
    { label: "Convertis", value: stats.converted, icon: TrendingUp, color: "text-green-400" },
  ];

  const statusCounts = [
    "new", "imported", "scored", "approved_to_send", "in_sequence",
    "replied_positive", "replied_neutral", "replied_negative",
    "meeting_booked", "converted", "bounced", "unsubscribed", "closed_lost"
  ];

  return (
    <AdminLayout>
      <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/outbound")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold">Analytics Outbound</h1>
          <p className="text-sm text-muted-foreground">Performance globale du moteur CRM</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">Chargement…</div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metrics.map(m => (
              <Card key={m.label} className="border-border/40">
                <CardContent className="p-4 text-center">
                  <m.icon className={`h-5 w-5 mx-auto mb-1 ${m.color}`} />
                  <div className="text-2xl font-bold">{m.value ?? 0}</div>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pipeline Funnel */}
          <Card className="border-border/40">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Pipeline CRM</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {statusCounts.map(status => {
                  const count = (stats.totalLeads > 0) ? 0 : 0; // placeholder
                  return null; // Pipeline visualization would go here
                })}
                <p className="text-sm text-muted-foreground text-center py-2">
                  {stats.totalLeads} leads total · {stats.meetingsBooked} RDV · {stats.converted} convertis
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Campaigns Performance */}
          <Card className="border-border/40">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Par campagne</CardTitle></CardHeader>
            <CardContent>
              {byCampaign.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune campagne</p>
              ) : (
                <div className="space-y-3">
                  {byCampaign.map(c => (
                    <div key={c.id} className="flex items-center justify-between border-b border-border/20 pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{c.campaign_name}</p>
                        <p className="text-xs text-muted-foreground">{c.city} · {c.specialty}</p>
                      </div>
                      <Badge className={c.campaign_status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}>
                        {c.campaign_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  </AdminLayout>
  );
}
