import { useRecruitmentAutomation } from "@/hooks/useRecruitmentAutomation";
import { useRecruitmentClusters } from "@/hooks/useRecruitmentClusters";
import { useRecruitmentCampaigns } from "@/hooks/useRecruitmentCampaigns";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Users, Mail, CreditCard, TrendingUp, AlertTriangle, CheckCircle, PauseCircle } from "lucide-react";

const StatCard = ({ title, value, icon: Icon, subtitle, color = "text-primary" }: any) => (
  <Card className="bg-card/80 backdrop-blur border-border/50">
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value ?? "—"}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
    </CardContent>
  </Card>
);

export default function PageAdminRecruitmentOverview() {
  const { funnelStats } = useRecruitmentAutomation();
  const { capacityTargets } = useRecruitmentClusters();
  const { campaigns } = useRecruitmentCampaigns();

  const stats = funnelStats.data;
  const isLoading = funnelStats.isLoading;

  const activeCampaigns = campaigns.data?.filter((c) => c.status === "active") || [];
  const fullClusters = capacityTargets.data?.filter((t) => t.recruitment_status === "full") || [];

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Hero */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Moteur de Recrutement</h1>
          <p className="text-sm text-muted-foreground">
            Vue d'ensemble du pipeline de recrutement automatisé
          </p>
        </div>

        {/* Banners */}
        {fullClusters.length > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-300">
              <strong>{fullClusters.length} cluster(s) rempli(s)</strong> — recrutement stoppé automatiquement
            </p>
          </div>
        )}

        {/* KPIs */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Prospects totaux" value={stats?.total_prospects} icon={Users} />
            <StatCard title="Qualifiés" value={stats?.qualified} icon={Target} color="text-blue-500" />
            <StatCard title="Contactés" value={stats?.contacted} icon={Mail} color="text-amber-500" />
            <StatCard title="Répondus" value={stats?.replied} icon={Mail} color="text-purple-500" />
            <StatCard title="En onboarding" value={stats?.onboarding} icon={TrendingUp} color="text-cyan-500" />
            <StatCard title="Payés" value={stats?.paid} icon={CreditCard} color="text-green-500" />
            <StatCard title="Activés" value={stats?.activated} icon={CheckCircle} color="text-emerald-500" />
            <StatCard title="Campagnes actives" value={stats?.campaigns_active} icon={Mail} subtitle={`${stats?.clusters_full || 0} clusters full`} />
          </div>
        )}

        {/* Funnel */}
        {stats && (
          <Card className="bg-card/80 backdrop-blur border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Funnel de conversion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Prospects", value: stats.total_prospects, max: stats.total_prospects },
                { label: "Qualifiés", value: stats.qualified, max: stats.total_prospects },
                { label: "Contactés", value: stats.contacted, max: stats.total_prospects },
                { label: "Répondus", value: stats.replied, max: stats.total_prospects },
                { label: "Payés", value: stats.paid, max: stats.total_prospects },
                { label: "Activés", value: stats.activated, max: stats.total_prospects },
              ].map((step) => (
                <div key={step.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{step.label}</span>
                    <span className="text-muted-foreground">{step.value} ({step.max ? Math.round((step.value / step.max) * 100) : 0}%)</span>
                  </div>
                  <Progress value={step.max ? (step.value / step.max) * 100 : 0} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Cluster Fill */}
        <Card className="bg-card/80 backdrop-blur border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Remplissage des clusters</CardTitle>
          </CardHeader>
          <CardContent>
            {capacityTargets.isLoading ? (
              <Skeleton className="h-40" />
            ) : (
              <div className="space-y-3">
                {capacityTargets.data?.map((t) => {
                  const fillPct = Number(t.fill_ratio_cached) * 100;
                  const isFull = t.recruitment_status === "full";
                  return (
                    <div key={t.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          {(t as any).recruitment_clusters?.name} — {t.category_slug}
                          <Badge variant={isFull ? "default" : "outline"} className={isFull ? "bg-green-500" : ""}>
                            {t.season_code}
                          </Badge>
                        </span>
                        <span className="text-muted-foreground">
                          {t.target_slots_paid}/{t.target_slots_total}
                          {isFull && <Badge className="ml-2 bg-green-500 text-xs">FULL</Badge>}
                        </span>
                      </div>
                      <Progress value={fillPct} className={`h-2 ${isFull ? "[&>div]:bg-green-500" : ""}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active campaigns */}
        <Card className="bg-card/80 backdrop-blur border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Campagnes actives</CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.isLoading ? (
              <Skeleton className="h-20" />
            ) : activeCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune campagne active</p>
            ) : (
              <div className="space-y-2">
                {activeCampaigns.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(c as any).recruitment_clusters?.name} • {c.category_slug} • {c.channel_mix}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-green-500 border-green-500/30">Actif</Badge>
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
