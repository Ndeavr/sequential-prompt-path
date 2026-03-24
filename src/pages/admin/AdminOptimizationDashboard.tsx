/**
 * UNPRO — Admin Optimization Dashboard
 */
import { Helmet } from "react-helmet-async";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import {
  useOptimizationKPIs, useOptimizationExperiments, useOptimizationOpportunities,
  useWinningVariants, useOptimizationAlerts, useOptimizationRules, useToggleRule,
  useUpdateExperimentStatus,
} from "@/hooks/optimization";
import {
  Zap, TrendingUp, AlertTriangle, Trophy, Beaker, Eye, Pause, Play,
  ArrowRight, ShieldCheck, Bot, Share2, MousePointer, Sparkles,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { EXPERIMENT_STATUS_LABELS, EXPERIMENT_TYPE_LABELS, QUICK_EXPERIMENT_TEMPLATES } from "@/types/optimization";
import type { ExperimentType, ExperimentStatus } from "@/types/optimization";

/* ── Command Center Bar ── */
const OptimizationCommandCenterBar = () => {
  const { data: kpis, isLoading } = useOptimizationKPIs();
  if (isLoading) return <Skeleton className="h-16 w-full rounded-xl" />;
  if (!kpis) return null;
  const items = [
    { label: "Expériences live", value: kpis.activeExperiments, icon: Beaker, color: "text-primary" },
    { label: "Uplift moyen", value: `+${kpis.avgLift}%`, icon: TrendingUp, color: "text-success" },
    { label: "Gagnantes", value: kpis.winningVariants, icon: Trophy, color: "text-warning" },
    { label: "Alertes", value: kpis.openAlerts, icon: AlertTriangle, color: kpis.openAlerts > 0 ? "text-destructive" : "text-muted-foreground" },
    { label: "Opportunités", value: kpis.openOpportunities, icon: Eye, color: "text-secondary" },
  ];
  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-secondary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Optimization Command Center</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {items.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <div>
                <p className="text-lg font-bold text-foreground">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

/* ── Live Experiments Section ── */
const LiveExperimentsSection = () => {
  const { data: experiments, isLoading } = useOptimizationExperiments("running" as ExperimentStatus);
  const updateStatus = useUpdateExperimentStatus();
  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  const list = experiments ?? [];
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Beaker className="h-4 w-4 text-primary" /> Expériences en cours</CardTitle>
          <CardDescription>{list.length} expérience{list.length !== 1 ? "s" : ""} active{list.length !== 1 ? "s" : ""}</CardDescription>
        </div>
        <Link to="/admin/experiments"><Button variant="outline" size="sm">Tout voir <ArrowRight className="h-3 w-3 ml-1" /></Button></Link>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune expérience en cours</p>
        ) : (
          <div className="space-y-3">
            {list.slice(0, 5).map((exp) => (
              <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{exp.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{EXPERIMENT_TYPE_LABELS[exp.experiment_type as ExperimentType] ?? exp.experiment_type}</Badge>
                    <span className="text-[11px] text-muted-foreground">{exp.primary_metric}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateStatus.mutate({ id: exp.id, status: "paused" })}>
                  <Pause className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Quick Launch ── */
const OneClickLaunchSection = () => {
  const iconMap: Record<string, any> = { MousePointer, Share2, ShieldCheck, Bot };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4 text-warning" /> Lancement rapide</CardTitle>
        <CardDescription>Créez une expérience en un clic</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {QUICK_EXPERIMENT_TEMPLATES.map((t) => {
          const Icon = iconMap[t.icon] ?? Beaker;
          return (
            <button key={t.type} className="flex flex-col items-start gap-1.5 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-primary/20 transition-all text-left">
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">{t.label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{t.description}</span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
};

/* ── Opportunities ── */
const OpportunitiesSection = () => {
  const { data, isLoading } = useOptimizationOpportunities();
  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  const list = (data ?? []) as any[];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Eye className="h-4 w-4 text-secondary" /> Opportunités détectées</CardTitle>
        <CardDescription>{list.length} opportunité{list.length !== 1 ? "s" : ""}</CardDescription>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune opportunité détectée</p>
        ) : (
          <div className="space-y-2">
            {list.slice(0, 5).map((opp) => (
              <div key={opp.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                <div>
                  <p className="text-sm font-medium text-foreground">{opp.title}</p>
                  <p className="text-[11px] text-muted-foreground">{opp.screen_key} · Confiance {opp.confidence_score}%</p>
                </div>
                <Badge variant={opp.priority === 'high' || opp.priority === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">{opp.priority}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Winners ── */
const WinnersSection = () => {
  const { data, isLoading } = useWinningVariants();
  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  const list = (data ?? []) as any[];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4 text-warning" /> Variantes gagnantes</CardTitle>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune variante gagnante encore</p>
        ) : (
          <div className="space-y-2">
            {list.slice(0, 5).map((w) => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20">
                <div>
                  <p className="text-sm font-medium text-foreground">{w.screen_key}</p>
                  <p className="text-[11px] text-muted-foreground">{w.decision_reason}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-success">+{w.primary_metric_lift_percent}%</p>
                  {w.auto_promoted && <Badge variant="outline" className="text-[9px]">Auto</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Rules ── */
const RulesSection = () => {
  const { data, isLoading } = useOptimizationRules();
  const toggle = useToggleRule();
  if (isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;
  const list = (data ?? []) as any[];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Règles d'auto-promotion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {list.map((rule) => (
          <div key={rule.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{rule.rule_name}</p>
              <p className="text-[11px] text-muted-foreground">Scope: {rule.scope}</p>
            </div>
            <Switch checked={rule.is_active} onCheckedChange={(v) => toggle.mutate({ id: rule.id, is_active: v })} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

/* ── Alerts ── */
const AlertsSection = () => {
  const { data, isLoading } = useOptimizationAlerts();
  if (isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;
  const list = (data ?? []) as any[];
  if (list.length === 0) return null;
  return (
    <Card className="border-destructive/20">
      <CardContent className="p-4 space-y-2">
        {list.slice(0, 3).map((a) => (
          <div key={a.id} className="flex items-start gap-2">
            <AlertTriangle className={`h-4 w-4 mt-0.5 ${a.severity === 'critical' ? 'text-destructive' : 'text-warning'}`} />
            <div>
              <p className="text-sm font-medium text-foreground">{a.title}</p>
              <p className="text-[11px] text-muted-foreground">{a.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

/* ── Main Page ── */
const AdminOptimizationDashboard = () => (
  <AdminLayout>
    <Helmet><title>Optimisation IA · UNPRO Admin</title></Helmet>
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Optimisation IA</h1>
        <p className="text-sm text-muted-foreground">Système d'auto-optimisation UNPRO</p>
      </div>

      <OptimizationCommandCenterBar />
      <AlertsSection />

      <div className="grid md:grid-cols-2 gap-6">
        <LiveExperimentsSection />
        <OneClickLaunchSection />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <OpportunitiesSection />
        <WinnersSection />
      </div>

      <RulesSection />
    </div>
  </AdminLayout>
);

export default AdminOptimizationDashboard;
