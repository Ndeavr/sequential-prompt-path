import { useRecruitmentCampaigns } from "@/hooks/useRecruitmentCampaigns";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Pause, Mail, MessageSquare } from "lucide-react";

const statusColor: Record<string, string> = {
  active: "bg-green-500",
  draft: "bg-muted",
  paused: "bg-amber-500",
  completed: "bg-blue-500",
};

export default function PageAdminRecruitmentCampaigns() {
  const { campaigns, sequences, launchCampaign, pauseCampaign } = useRecruitmentCampaigns();

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Campagnes de recrutement</h1>
          <p className="text-sm text-muted-foreground">Gérer les campagnes email/SMS automatisées</p>
        </div>

        {campaigns.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </div>
        ) : campaigns.data?.length === 0 ? (
          <Card className="bg-card/80 backdrop-blur">
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucune campagne configurée
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {campaigns.data?.map((c) => {
              const campSequences = sequences.data?.filter((s) => s.campaign_id === c.id) || [];
              return (
                <Card key={c.id} className="bg-card/80 backdrop-blur border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <Badge className={statusColor[c.status] || ""}>{c.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{(c as any).recruitment_clusters?.name}</span>
                      <span>•</span>
                      <span className="capitalize">{c.category_slug}</span>
                      <span>•</span>
                      <span>{c.season_code}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {c.channel_mix?.includes("email") && <Mail className="h-3 w-3" />}
                        {c.channel_mix?.includes("sms") && <MessageSquare className="h-3 w-3" />}
                        {c.channel_mix}
                      </span>
                      <span>•</span>
                      <span>Max {c.daily_send_limit}/jour</span>
                    </div>

                    {campSequences.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium">Séquences ({campSequences.length})</p>
                        {campSequences.map((s) => (
                          <div key={s.id} className="text-xs bg-muted/30 rounded p-2 flex items-center justify-between">
                            <span>{s.name}</span>
                            <Badge variant="outline" className="text-xs">{s.sequence_status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {c.status === "draft" && (
                        <Button size="sm" onClick={() => launchCampaign.mutate(c.id)} disabled={launchCampaign.isPending}>
                          <Play className="h-3 w-3 mr-1" /> Lancer
                        </Button>
                      )}
                      {c.status === "active" && (
                        <Button size="sm" variant="outline" onClick={() => pauseCampaign.mutate(c.id)} disabled={pauseCampaign.isPending}>
                          <Pause className="h-3 w-3 mr-1" /> Pause
                        </Button>
                      )}
                      {c.status === "paused" && (
                        <Button size="sm" onClick={() => launchCampaign.mutate(c.id)} disabled={launchCampaign.isPending}>
                          <Play className="h-3 w-3 mr-1" /> Reprendre
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
