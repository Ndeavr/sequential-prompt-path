/**
 * UNPRO — Admin Screenshot Analytics Page
 */
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, StatCard, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useScreenshotAnalytics,
  useRecentScreenshotEvents,
  useFrictionScoring,
  useAdminScreenshotAlerts,
} from "@/hooks/screenshot/useScreenshotAnalytics";
import { Camera, Share2, TrendingUp, AlertTriangle, Eye, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import CriticalScreenshotInsightsBar from "@/components/admin/screenshot-analytics/CriticalScreenshotInsightsBar";

export default function AdminScreenshotAnalyticsPage() {
  const { daily, topScreens, conversion, roleBreakdown } = useScreenshotAnalytics();
  const { data: recentEvents, isLoading: eventsLoading } = useRecentScreenshotEvents(10);
  const { data: frictionData } = useFrictionScoring();
  const { data: alerts } = useAdminScreenshotAlerts("open");

  const isLoading = daily.isLoading || conversion.isLoading;

  if (isLoading) return <AdminLayout><LoadingState /></AdminLayout>;

  const conv = conversion.data;
  const topFriction = frictionData?.[0];
  const openAlerts = alerts?.length ?? 0;

  return (
    <AdminLayout>
      <CriticalScreenshotInsightsBar />
      <PageHeader
        title="Screenshot Intelligence"
        description="Analyse des captures d'écran et du partage"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total captures"
          value={conv?.total_screenshots ?? 0}
          icon={<Camera className="h-4 w-4" />}
        />
        <StatCard
          title="Partagés"
          value={conv?.total_converted ?? 0}
          icon={<Share2 className="h-4 w-4" />}
        />
        <StatCard
          title="Conversion"
          value={`${conv?.conversion_rate_percent ?? 0}%`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title="Alertes ouvertes"
          value={openAlerts}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Top Screens */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Top écrans capturés</CardTitle>
              <Link to="/admin/screenshot-friction" className="text-xs text-primary hover:underline">Friction →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {topScreens.data?.length ? topScreens.data.slice(0, 6).map((s: any) => (
              <div key={s.screen_key} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[180px]">{s.screen_name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{s.total_screenshots} captures</Badge>
                  <Badge variant="outline" className="text-[10px]">{s.total_converted_shares} partagés</Badge>
                </div>
              </div>
            )) : <EmptyState message="Aucune donnée encore." />}
          </CardContent>
        </Card>

        {/* Role Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Par rôle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {roleBreakdown.data?.length ? roleBreakdown.data.map((r: any) => (
              <div key={r.role} className="flex items-center justify-between text-sm">
                <span className="capitalize">{r.role}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{r.total_screenshots} captures</span>
                  <span className="text-xs text-primary">{r.total_converted} partagés</span>
                </div>
              </div>
            )) : <EmptyState message="Aucune donnée." />}
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Événements récents</CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? <LoadingState /> : (
            <div className="space-y-2">
              {recentEvents?.length ? recentEvents.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between text-sm border-b border-border/20 pb-2 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{e.screen_name}</span>
                    <Badge variant="outline" className="text-[9px] shrink-0">{e.platform}</Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {e.share_cta_clicked && <Badge className="text-[9px] bg-success/10 text-success border-success/20">Partagé</Badge>}
                    {e.dismissed && <Badge variant="destructive" className="text-[9px]">Ignoré</Badge>}
                    <span className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString("fr-CA")}</span>
                  </div>
                </div>
              )) : <EmptyState message="Aucun événement encore." />}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
