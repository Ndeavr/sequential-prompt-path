import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, Target, Mail, CreditCard, CheckCircle2, ArrowRight, Zap } from "lucide-react";
import { useRecruitmentPipelineKPIs, useRecruitmentConversions, useAIPPScoreDistribution } from "@/hooks/useRecruitmentCommandCenter";
import { Helmet } from "react-helmet-async";

function FunnelBar({ label, count, total, icon: Icon, color }: {
  label: string; count: number; total: number; icon: any; color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const width = total > 0 ? Math.max(pct, 8) : 8;
  return (
    <div className="flex items-center gap-3">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex justify-between text-xs">
          <span>{label}</span>
          <span className="font-bold">{count} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
        </div>
        <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${color.replace("/20", "/60")}`} style={{ width: `${width}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function PageAdminContractorConversionFunnel() {
  const { data: kpis, isLoading } = useRecruitmentPipelineKPIs();
  const { data: conversions } = useRecruitmentConversions();
  const { data: aipp } = useAIPPScoreDistribution();

  const total = kpis?.total ?? 0;

  return (
    <AdminLayout>
      <Helmet><title>Entonnoir de Conversion — UNPRO</title></Helmet>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Entonnoir de Conversion</h1>
          <p className="text-sm text-muted-foreground">Du prospect brut à l'entrepreneur activé — pipeline complet</p>
        </div>

        {/* Visual Funnel */}
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : (
          <Card className="border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" /> Pipeline Complet</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FunnelBar label="Prospects extraits" count={total} total={total} icon={Users} color="bg-primary/20 text-primary" />
              <div className="flex justify-center"><ArrowRight className="h-4 w-4 text-muted-foreground/50 rotate-90" /></div>
              <FunnelBar label="Qualifiés (AIPP scoré)" count={kpis?.qualified ?? 0} total={total} icon={Target} color="bg-blue-500/20 text-blue-400" />
              <div className="flex justify-center"><ArrowRight className="h-4 w-4 text-muted-foreground/50 rotate-90" /></div>
              <FunnelBar label="Contactés (email/SMS)" count={kpis?.contacted ?? 0} total={total} icon={Mail} color="bg-amber-500/20 text-amber-400" />
              <div className="flex justify-center"><ArrowRight className="h-4 w-4 text-muted-foreground/50 rotate-90" /></div>
              <FunnelBar label="Engagés (répondu/cliqué)" count={kpis?.engaged ?? 0} total={total} icon={TrendingUp} color="bg-purple-500/20 text-purple-400" />
              <div className="flex justify-center"><ArrowRight className="h-4 w-4 text-muted-foreground/50 rotate-90" /></div>
              <FunnelBar label="En onboarding" count={kpis?.onboarding ?? 0} total={total} icon={TrendingUp} color="bg-cyan-500/20 text-cyan-400" />
              <div className="flex justify-center"><ArrowRight className="h-4 w-4 text-muted-foreground/50 rotate-90" /></div>
              <FunnelBar label="Payés" count={kpis?.paid ?? 0} total={total} icon={CreditCard} color="bg-green-500/20 text-green-400" />
              <div className="flex justify-center"><ArrowRight className="h-4 w-4 text-muted-foreground/50 rotate-90" /></div>
              <FunnelBar label="Activés (live)" count={kpis?.activated ?? 0} total={total} icon={CheckCircle2} color="bg-emerald-500/20 text-emerald-400" />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* AIPP Score Distribution */}
          <Card className="border-border/40 bg-card/60">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Distribution AIPP</CardTitle></CardHeader>
            <CardContent>
              {aipp?.byTier && Object.keys(aipp.byTier).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(aipp.byTier).sort(([, a], [, b]) => (b as number) - (a as number)).map(([tier, count]) => (
                    <div key={tier} className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{tier}</Badge>
                      <div className="flex items-center gap-2">
                        <Progress value={aipp.total > 0 ? ((count as number) / aipp.total) * 100 : 0} className="h-2 w-24" />
                        <span className="text-xs font-medium w-8 text-right">{count as number}</span>
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground mt-2">Score moyen: {Math.round(aipp.avgScore)}/100</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun score AIPP</p>
              )}
            </CardContent>
          </Card>

          {/* Conversion by source */}
          <Card className="border-border/40 bg-card/60">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Conversions par source</CardTitle></CardHeader>
            <CardContent>
              {!conversions?.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune conversion</p>
              ) : (
                <div className="space-y-2">
                  {["email", "sms", "alex"].map(source => {
                    const count = conversions.filter((c: any) => c.conversion_source === source).length;
                    return (
                      <div key={source} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{source}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={conversions.length > 0 ? (count / conversions.length) * 100 : 0} className="h-2 w-24" />
                          <span className="text-xs font-medium w-8 text-right">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Conversions timeline */}
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Dernières conversions</CardTitle></CardHeader>
          <CardContent>
            {!conversions?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">—</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {conversions.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{c.contractor_prospects?.business_name ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{c.contractor_prospects?.city} · via {c.conversion_source}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-400">{c.plan_selected}</Badge>
                      {c.revenue_projection > 0 && (
                        <p className="text-[10px] text-muted-foreground">{c.revenue_projection.toLocaleString()} $/an</p>
                      )}
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
