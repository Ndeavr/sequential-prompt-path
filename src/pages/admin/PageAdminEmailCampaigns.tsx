import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Mail, Play, Pause, TrendingUp, Eye, MousePointer, MessageSquare, AlertTriangle } from "lucide-react";
import { useRecruitmentCampaigns } from "@/hooks/useRecruitmentCampaigns";
import { useOutreachMessageStats } from "@/hooks/useRecruitmentCommandCenter";
import { Helmet } from "react-helmet-async";

const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  paused: "bg-amber-500/20 text-amber-400",
  draft: "bg-muted text-muted-foreground",
  completed: "bg-blue-500/20 text-blue-400",
};

export default function PageAdminEmailCampaigns() {
  const { campaigns, messages, launchCampaign, pauseCampaign } = useRecruitmentCampaigns();
  const { data: stats } = useOutreachMessageStats();

  const openRate = stats && stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0;
  const clickRate = stats && stats.opened > 0 ? Math.round((stats.clicked / stats.opened) * 100) : 0;
  const replyRate = stats && stats.sent > 0 ? Math.round((stats.replied / stats.sent) * 100) : 0;

  return (
    <AdminLayout>
      <Helmet><title>Campagnes Email — UNPRO</title></Helmet>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Campagnes Outreach</h1>
          <p className="text-sm text-muted-foreground">Emails et SMS de recrutement — performance en direct</p>
        </div>

        {/* Global stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { l: "Envoyés", v: stats?.sent ?? 0, icon: Mail, c: "bg-primary/20 text-primary" },
            { l: "Taux ouverture", v: `${openRate}%`, icon: Eye, c: "bg-blue-500/20 text-blue-400" },
            { l: "Taux clic", v: `${clickRate}%`, icon: MousePointer, c: "bg-amber-500/20 text-amber-400" },
            { l: "Taux réponse", v: `${replyRate}%`, icon: MessageSquare, c: "bg-emerald-500/20 text-emerald-400" },
          ].map(s => (
            <Card key={s.l} className="border-border/40 bg-card/60">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.c}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{s.v}</p>
                  <p className="text-[10px] text-muted-foreground">{s.l}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Campaigns List */}
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Mail className="h-4 w-4" /> Campagnes</CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : !campaigns.data?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune campagne</p>
            ) : (
              <div className="space-y-3">
                {campaigns.data.map((c: any) => (
                  <div key={c.id} className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {c.recruitment_clusters?.name ?? "—"} · créée {new Date(c.created_at).toLocaleDateString("fr-CA")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={`text-[10px] ${CAMPAIGN_STATUS_COLORS[c.status] || ""}`}>
                          {c.status}
                        </Badge>
                        {c.status === "active" ? (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => pauseCampaign.mutate(c.id)}>
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                        ) : c.status !== "completed" ? (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => launchCampaign.mutate(c.id)}>
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Messages Récents</CardTitle>
          </CardHeader>
          <CardContent>
            {messages.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : !messages.data?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucun message envoyé</p>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {messages.data.slice(0, 30).map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{m.subject || m.template_name || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{m.recipient_email || "—"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{m.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleDateString("fr-CA")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
