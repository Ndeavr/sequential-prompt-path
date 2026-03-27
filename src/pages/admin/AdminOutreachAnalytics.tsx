import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Eye, MousePointerClick, UserCheck, AlertTriangle, Ban, TrendingUp } from "lucide-react";

export default function AdminOutreachAnalytics() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [campRes, msgRes] = await Promise.all([
      supabase.from("outreach_campaigns").select("id, name, status, primary_channel, created_at").order("created_at", { ascending: false }),
      supabase.from("outreach_messages").select("campaign_id, message_status, channel_type").limit(1000),
    ]);
    setCampaigns(campRes.data || []);
    setMessages(msgRes.data || []);
    setLoading(false);
  }

  function getStats(campaignId: string) {
    const msgs = messages.filter(m => m.campaign_id === campaignId);
    return {
      total: msgs.length,
      sent: msgs.filter(m => !["queued", "cancelled"].includes(m.message_status)).length,
      delivered: msgs.filter(m => ["delivered", "opened", "clicked", "replied"].includes(m.message_status)).length,
      opened: msgs.filter(m => ["opened", "clicked", "replied"].includes(m.message_status)).length,
      clicked: msgs.filter(m => ["clicked", "replied"].includes(m.message_status)).length,
      bounced: msgs.filter(m => m.message_status === "bounced").length,
      failed: msgs.filter(m => m.message_status === "failed").length,
    };
  }

  const totalStats = {
    total: messages.length,
    sent: messages.filter(m => !["queued", "cancelled"].includes(m.message_status)).length,
    opened: messages.filter(m => ["opened", "clicked", "replied"].includes(m.message_status)).length,
    clicked: messages.filter(m => ["clicked", "replied"].includes(m.message_status)).length,
    bounced: messages.filter(m => m.message_status === "bounced").length,
  };

  const cards = [
    { label: "Total envoyés", value: totalStats.sent, icon: Send },
    { label: "Ouvertures", value: totalStats.opened, icon: Eye },
    { label: "Clics", value: totalStats.clicked, icon: MousePointerClick },
    { label: "Taux ouverture", value: totalStats.sent ? `${((totalStats.opened / totalStats.sent) * 100).toFixed(1)}%` : "—", icon: TrendingUp },
    { label: "Taux clic", value: totalStats.sent ? `${((totalStats.clicked / totalStats.sent) * 100).toFixed(1)}%` : "—", icon: MousePointerClick },
    { label: "Bounces", value: totalStats.bounced, icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/outreach")}><ArrowLeft className="h-4 w-4 mr-1" /> Retour</Button>
      <h1 className="font-display text-2xl font-bold">Analytics Outreach</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="p-4 text-center">
              <c.icon className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Performance par campagne</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-center py-8 text-muted-foreground">Chargement…</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campagne</TableHead>
                  <TableHead>Envoyés</TableHead>
                  <TableHead>Livrés</TableHead>
                  <TableHead>Ouvertures</TableHead>
                  <TableHead>Clics</TableHead>
                  <TableHead>Bounces</TableHead>
                  <TableHead>Taux ouv.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map(c => {
                  const s = getStats(c.id);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{s.sent}</TableCell>
                      <TableCell>{s.delivered}</TableCell>
                      <TableCell>{s.opened}</TableCell>
                      <TableCell>{s.clicked}</TableCell>
                      <TableCell>{s.bounced}</TableCell>
                      <TableCell>{s.sent ? `${((s.opened / s.sent) * 100).toFixed(1)}%` : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
