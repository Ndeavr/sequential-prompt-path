/**
 * UNPRO — Admin Screenshot Friction Page
 */
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState, StatCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFrictionScoring } from "@/hooks/screenshot/useScreenshotAnalytics";
import { Flame, TrendingDown, Eye, BarChart3 } from "lucide-react";

const FRICTION_COLORS: Record<string, string> = {
  low: "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AdminScreenshotFrictionPage() {
  const { data: friction, isLoading } = useFrictionScoring();

  if (isLoading) return <AdminLayout><LoadingState /></AdminLayout>;

  const criticalCount = friction?.filter((f: any) => f.friction_level === "critical").length ?? 0;
  const highCount = friction?.filter((f: any) => f.friction_level === "high").length ?? 0;

  return (
    <AdminLayout>
      <PageHeader title="Friction UX" description="Scores de friction par écran — captures vs partages" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard title="Écrans analysés" value={friction?.length ?? 0} icon={<Eye className="h-4 w-4" />} />
        <StatCard title="Critiques" value={criticalCount} icon={<Flame className="h-4 w-4" />} />
        <StatCard title="Élevés" value={highCount} icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard title="Score max" value={friction?.[0]?.friction_score ?? 0} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Classement par friction</CardTitle>
        </CardHeader>
        <CardContent>
          {!friction?.length ? <EmptyState message="Aucune donnée de friction." /> : (
            <div className="space-y-3">
              {friction.map((f: any) => (
                <div key={f.screen_key} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/20">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">{f.screen_name}</span>
                      <Badge className={`text-[9px] ${FRICTION_COLORS[f.friction_level] ?? ""}`}>
                        {f.friction_level}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{f.total_screenshots} captures</span>
                      <span>{f.total_share_converted} partagés</span>
                      <span>Dismiss {f.dismiss_rate_percent}%</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-display font-bold text-foreground">{f.friction_score}</div>
                    <div className="text-[10px] text-muted-foreground">score</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
