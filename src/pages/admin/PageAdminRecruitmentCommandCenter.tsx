import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Activity, AlertTriangle, BarChart3, Bot, CheckCircle2, CreditCard,
  Database, Mail, RefreshCw, Target, TrendingUp, Users, Zap, XCircle,
} from "lucide-react";
import {
  useRecruitmentPipelineKPIs,
  useRecruitmentAgentsStatus,
  useOutreachMessageStats,
  useExtractionMonitor,
  useAIPPScoreDistribution,
  useRecruitmentConversions,
} from "@/hooks/useRecruitmentCommandCenter";
import { Helmet } from "react-helmet-async";

/* ─── KPI Card ─── */
function KpiCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: any; color: string; sub?: string;
}) {
  return (
    <Card className="border-border/40 bg-card/60 backdrop-blur">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground truncate">{label}</p>
          {sub && <p className="text-[9px] text-muted-foreground/70">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Funnel Bar ─── */
function FunnelStep({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{count} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

/* ─── Agent Status Row ─── */
function AgentRow({ agent }: { agent: any }) {
  const statusColor = agent.status === "active" ? "bg-emerald-500/20 text-emerald-400"
    : agent.status === "paused" ? "bg-amber-500/20 text-amber-400"
    : "bg-destructive/20 text-destructive";
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <Bot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm truncate">{agent.agent_name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">{agent.tasks_executed ?? 0} runs</span>
        <Badge variant="outline" className={`text-[10px] ${statusColor}`}>{agent.status}</Badge>
      </div>
    </div>
  );
}

export default function PageAdminRecruitmentCommandCenter() {
  const { data: kpis, isLoading: kpiLoading } = useRecruitmentPipelineKPIs();
  const { data: agents, isLoading: agentLoading } = useRecruitmentAgentsStatus();
  const { data: outreach } = useOutreachMessageStats();
  const { data: extraction } = useExtractionMonitor();
  const { data: aipp } = useAIPPScoreDistribution();
  const { data: conversions } = useRecruitmentConversions();

  return (
    <AdminLayout>
      <Helmet><title>Centre de Commande Recrutement — UNPRO</title></Helmet>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Hero */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Centre de Commande</h1>
            <p className="text-sm text-muted-foreground">Pipeline de recrutement autonome — temps réel</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Rafraîchir
          </Button>
        </div>

        {/* KPI Grid */}
        {kpiLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Prospects totaux" value={kpis?.total ?? 0} icon={Users} color="bg-primary/20 text-primary" />
            <KpiCard label="Qualifiés" value={kpis?.qualified ?? 0} icon={Target} color="bg-blue-500/20 text-blue-400" />
            <KpiCard label="Contactés" value={kpis?.contacted ?? 0} icon={Mail} color="bg-amber-500/20 text-amber-400" />
            <KpiCard label="Engagés" value={kpis?.engaged ?? 0} icon={Activity} color="bg-purple-500/20 text-purple-400" />
            <KpiCard label="Onboarding" value={kpis?.onboarding ?? 0} icon={TrendingUp} color="bg-cyan-500/20 text-cyan-400" />
            <KpiCard label="Payés" value={kpis?.paid ?? 0} icon={CreditCard} color="bg-green-500/20 text-green-400" />
            <KpiCard label="Activés" value={kpis?.activated ?? 0} icon={CheckCircle2} color="bg-emerald-500/20 text-emerald-400" />
            <KpiCard label="Score AIPP moy." value={Math.round(aipp?.avgScore ?? 0)} icon={BarChart3} color="bg-orange-500/20 text-orange-400" sub={`${aipp?.total ?? 0} scorés`} />
          </div>
        )}

        {/* Funnel + Agents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Conversion Funnel */}
          <Card className="border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" /> Entonnoir de Conversion</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <FunnelStep label="Prospects" count={kpis?.total ?? 0} total={kpis?.total ?? 1} color="bg-primary" />
              <FunnelStep label="Qualifiés" count={kpis?.qualified ?? 0} total={kpis?.total ?? 1} color="bg-blue-500" />
              <FunnelStep label="Contactés" count={kpis?.contacted ?? 0} total={kpis?.total ?? 1} color="bg-amber-500" />
              <FunnelStep label="Engagés" count={kpis?.engaged ?? 0} total={kpis?.total ?? 1} color="bg-purple-500" />
              <FunnelStep label="Onboarding" count={kpis?.onboarding ?? 0} total={kpis?.total ?? 1} color="bg-cyan-500" />
              <FunnelStep label="Payés" count={kpis?.paid ?? 0} total={kpis?.total ?? 1} color="bg-green-500" />
              <FunnelStep label="Activés" count={kpis?.activated ?? 0} total={kpis?.total ?? 1} color="bg-emerald-500" />
            </CardContent>
          </Card>

          {/* Agent Status */}
          <Card className="border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4" /> Agents Actifs</CardTitle></CardHeader>
            <CardContent>
              {agentLoading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
              ) : agents?.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun agent de recrutement enregistré</p>
              ) : (
                <div className="max-h-72 overflow-y-auto">{agents?.map(a => <AgentRow key={a.agent_key} agent={a} />)}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Outreach + Extraction */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Email Performance */}
          <Card className="border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Mail className="h-4 w-4" /> Performance Outreach</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { l: "Envoyés", v: outreach?.sent ?? 0 },
                  { l: "Ouverts", v: outreach?.opened ?? 0 },
                  { l: "Cliqués", v: outreach?.clicked ?? 0 },
                  { l: "Répondus", v: outreach?.replied ?? 0 },
                  { l: "Bounced", v: outreach?.bounced ?? 0 },
                  { l: "Email / SMS", v: `${outreach?.byChannel?.email ?? 0} / ${outreach?.byChannel?.sms ?? 0}` },
                ].map(s => (
                  <div key={s.l} className="p-2 rounded-lg bg-muted/30">
                    <p className="text-lg font-bold">{s.v}</p>
                    <p className="text-[10px] text-muted-foreground">{s.l}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Extraction */}
          <Card className="border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" /> Extraction de Données</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-center mb-3">
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-lg font-bold">{extraction?.total ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Extraits</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-lg font-bold">{extraction?.enriched ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Enrichis</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-lg font-bold">{extraction?.pending ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">En attente</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-lg font-bold">{Math.round(extraction?.avgConfidence ?? 0)}%</p>
                  <p className="text-[10px] text-muted-foreground">Confiance moy.</p>
                </div>
              </div>
              {extraction?.bySources && Object.keys(extraction.bySources).length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium">Par source</p>
                  {Object.entries(extraction.bySources).map(([s, c]) => (
                    <div key={s} className="flex justify-between text-xs">
                      <span className="text-muted-foreground truncate">{s}</span>
                      <span className="font-medium">{c as number}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Conversions */}
        <Card className="border-border/40 bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Conversions Récentes</CardTitle></CardHeader>
          <CardContent>
            {!conversions?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune conversion enregistrée</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {conversions.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{(c as any).contractor_prospects?.business_name ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{(c as any).contractor_prospects?.city} · {c.conversion_source}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-[10px]">{c.plan_selected}</Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(c.created_at).toLocaleDateString("fr-CA")}</p>
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
