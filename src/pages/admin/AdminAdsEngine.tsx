/**
 * UNPRO — Admin AI Ads Engine Dashboard
 */
import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdCampaigns, useCampaignStats, useCreateCampaign, useUpdateCampaignStatus } from "@/hooks/useAdsEngine";
import { calculateROI } from "@/services/adsEngine";
import { Megaphone, TrendingUp, DollarSign, MousePointerClick, Target, Play, Pause, Plus } from "lucide-react";

export default function AdminAdsEngine() {
  const [platform, setPlatform] = useState<string | undefined>();
  const { data: campaigns = [], isLoading } = useAdCampaigns(platform);
  const { data: stats } = useCampaignStats();
  const updateStatus = useUpdateCampaignStatus();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Ads Engine</h1>
            <p className="text-sm text-muted-foreground">Campagnes générées automatiquement depuis les données de demande</p>
          </div>
          <Button size="sm" disabled>
            <Plus className="h-4 w-4 mr-1" /> Générer campagnes
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Megaphone className="h-5 w-5" />} label="Campagnes actives" value={stats?.activeCampaigns ?? 0} />
          <StatCard icon={<MousePointerClick className="h-5 w-5" />} label="Clics totaux" value={stats?.totalClicks ?? 0} />
          <StatCard icon={<Target className="h-5 w-5" />} label="Conversions" value={stats?.totalConversions ?? 0} />
          <StatCard icon={<DollarSign className="h-5 w-5" />} label="Coût/conversion" value={`${((stats?.costPerConversion ?? 0) / 100).toFixed(2)} $`} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" onValueChange={(v) => setPlatform(v === "all" ? undefined : v)}>
          <TabsList>
            <TabsTrigger value="all">Toutes</TabsTrigger>
            <TabsTrigger value="google">Google Ads</TabsTrigger>
            <TabsTrigger value="meta">Meta Ads</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <CampaignList campaigns={campaigns} isLoading={isLoading} onStatusChange={(id, s) => updateStatus.mutate({ id, status: s })} />
          </TabsContent>
          <TabsContent value="google" className="mt-4">
            <CampaignList campaigns={campaigns} isLoading={isLoading} onStatusChange={(id, s) => updateStatus.mutate({ id, status: s })} />
          </TabsContent>
          <TabsContent value="meta" className="mt-4">
            <CampaignList campaigns={campaigns} isLoading={isLoading} onStatusChange={(id, s) => updateStatus.mutate({ id, status: s })} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CampaignList({ campaigns, isLoading, onStatusChange }: {
  campaigns: any[];
  isLoading: boolean;
  onStatusChange: (id: string, status: string) => void;
}) {
  if (isLoading) return <p className="text-sm text-muted-foreground py-8 text-center">Chargement…</p>;
  if (campaigns.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">Aucune campagne. Générez-en depuis les données de demande.</p>;

  return (
    <div className="space-y-3">
      {campaigns.map((c) => {
        const { roi, efficiency } = calculateROI(c);
        const effColor = efficiency === "excellent" ? "text-green-600" : efficiency === "good" ? "text-blue-600" : efficiency === "poor" ? "text-red-600" : "text-muted-foreground";
        return (
          <Card key={c.id}>
            <CardContent className="py-4 px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={c.platform === "google" ? "default" : "secondary"} className="text-[10px]">
                      {c.platform === "google" ? "Google" : "Meta"}
                    </Badge>
                    <Badge variant={c.status === "active" ? "default" : "outline"} className="text-[10px]">
                      {c.status}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm truncate">{c.campaign_name}</h3>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{c.impressions?.toLocaleString()} impr.</span>
                    <span>{c.clicks?.toLocaleString()} clics</span>
                    <span>{c.conversions} conv.</span>
                    <span className={effColor}>ROI {roi}%</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {c.status === "active" ? (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onStatusChange(c.id, "paused")}>
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onStatusChange(c.id, "active")}>
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
