/**
 * UNPRO — AI Growth Insights Dashboard
 * Admin view for optimization insights, actions, and A/B tests.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain, TrendingUp, AlertTriangle, Rocket, Target,
  Check, X, FlaskConical, RefreshCw, Zap, BarChart3,
  ArrowRight, Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Insight {
  id: string;
  placement_id: string | null;
  feature: string | null;
  city: string | null;
  role: string | null;
  metric_type: string;
  metric_value: number;
  insight_type: string;
  confidence_score: number;
  created_at: string;
}

interface Action {
  id: string;
  insight_id: string;
  action_type: string;
  target_rule_id: string | null;
  target_placement_id: string | null;
  old_value: any;
  new_value: any;
  status: string;
  applied_at: string | null;
  created_at: string;
}

const INSIGHT_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  landing_weak: { icon: AlertTriangle, color: "text-amber-500", label: "Landing faible", badgeVariant: "destructive" },
  auth_friction: { icon: AlertTriangle, color: "text-red-500", label: "Friction auth", badgeVariant: "destructive" },
  high_performer: { icon: Rocket, color: "text-emerald-500", label: "Haute performance", badgeVariant: "default" },
  placement_underperforming: { icon: Target, color: "text-orange-500", label: "Placement faible", badgeVariant: "secondary" },
  reward_opportunity: { icon: Zap, color: "text-violet-500", label: "Opportunité récompense", badgeVariant: "secondary" },
  scaling_opportunity: { icon: TrendingUp, color: "text-blue-500", label: "Scaling possible", badgeVariant: "default" },
};

const ACTION_LABELS: Record<string, string> = {
  increase_reward: "Augmenter récompense",
  decrease_reward: "Réduire récompense",
  boost_placement_visibility: "Booster visibilité",
  change_bundle_order: "Réordonner bundle",
  switch_default_feature: "Changer feature par défaut",
  enable_ab_test: "Lancer A/B test",
};

export default function AdminAIGrowthInsights() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: insights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: async () => {
      const { data } = await supabase
        .from("optimization_insights" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as unknown as Insight[];
    },
  });

  const { data: actions = [] } = useQuery({
    queryKey: ["ai-actions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("optimization_actions" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []) as unknown as Action[];
    },
  });

  const { data: funnelMetrics } = useQuery({
    queryKey: ["funnel-metrics"],
    queryFn: async () => {
      const events = supabase.from("deep_link_events" as any);
      const [s, v, c, a, f] = await Promise.all([
        events.select("id", { count: "exact", head: true }).eq("event_type", "qr_scanned"),
        events.select("id", { count: "exact", head: true }).eq("event_type", "landing_viewed"),
        events.select("id", { count: "exact", head: true }).eq("event_type", "cta_clicked"),
        events.select("id", { count: "exact", head: true }).eq("event_type", "auth_completed"),
        events.select("id", { count: "exact", head: true }).eq("event_type", "feature_completed"),
      ]);
      return {
        scans: s.count || 0,
        views: v.count || 0,
        ctas: c.count || 0,
        auths: a.count || 0,
        completions: f.count || 0,
      };
    },
  });

  const runOptimizer = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("growth-optimizer");
      if (error) throw error;
      toast.success(`${data?.insightCount || 0} insights générés`);
      qc.invalidateQueries({ queryKey: ["ai-insights"] });
      qc.invalidateQueries({ queryKey: ["ai-actions"] });
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'optimisation");
    } finally {
      setRunning(false);
    }
  };

  const applyAction = useMutation({
    mutationFn: async (actionId: string) => {
      await supabase
        .from("optimization_actions" as any)
        .update({ status: "applied", applied_at: new Date().toISOString() })
        .eq("id", actionId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-actions"] });
      toast.success("Action appliquée");
    },
  });

  const ignoreAction = useMutation({
    mutationFn: async (actionId: string) => {
      await supabase
        .from("optimization_actions" as any)
        .update({ status: "ignored" })
        .eq("id", actionId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-actions"] });
      toast.success("Action ignorée");
    },
  });

  const pendingActions = actions.filter(a => a.status === "pending");
  const appliedActions = actions.filter(a => a.status === "applied");

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Growth Insights</h1>
              <p className="text-sm text-muted-foreground">Optimisation automatique du funnel</p>
            </div>
          </div>
          <Button onClick={runOptimizer} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {running ? "Analyse..." : "Lancer l'analyse IA"}
          </Button>
        </div>

        {/* Funnel overview */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />Funnel en temps réel</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 text-center">
              {[
                { label: "Scans", value: funnelMetrics?.scans ?? 0 },
                { label: "Views", value: funnelMetrics?.views ?? 0 },
                { label: "CTAs", value: funnelMetrics?.ctas ?? 0 },
                { label: "Auth", value: funnelMetrics?.auths ?? 0 },
                { label: "Completions", value: funnelMetrics?.completions ?? 0 },
              ].map((m, i, arr) => (
                <div key={m.label} className="flex items-center gap-2">
                  <div className="flex-1">
                    <p className="text-xl font-bold">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    {i > 0 && arr[i - 1].value > 0 && (
                      <p className="text-[10px] text-primary font-medium">
                        {Math.round((m.value / arr[i - 1].value) * 100)}%
                      </p>
                    )}
                  </div>
                  {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending actions */}
        {pendingActions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Actions suggérées ({pendingActions.length})
            </h2>
            {pendingActions.map(action => {
              const insight = insights.find(i => i.id === action.insight_id);
              const cfg = INSIGHT_CONFIG[insight?.insight_type || ""] || INSIGHT_CONFIG.landing_weak;
              const Icon = cfg.icon;
              return (
                <Card key={action.id} className="border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
                        <Icon className={`h-5 w-5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={cfg.badgeVariant} className="text-[10px]">{cfg.label}</Badge>
                          <span className="text-[10px] text-muted-foreground">
                            Confiance: {Math.round((insight?.confidence_score || 0) * 100)}%
                          </span>
                        </div>
                        <p className="text-sm font-medium">
                          {(action.new_value as any)?.description || ACTION_LABELS[action.action_type] || action.action_type}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-[10px]">{ACTION_LABELS[action.action_type] || action.action_type}</Badge>
                          {insight?.metric_type && (
                            <span className="text-[10px] text-muted-foreground">
                              {insight.metric_type}: {(insight.metric_value * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 ml-[52px]">
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => applyAction.mutate(action.id)}
                        disabled={applyAction.isPending}
                      >
                        <Check className="h-3.5 w-3.5" />Appliquer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => ignoreAction.mutate(action.id)}
                        disabled={ignoreAction.isPending}
                      >
                        <X className="h-3.5 w-3.5" />Ignorer
                      </Button>
                      <Button size="sm" variant="ghost" className="gap-1.5 text-xs">
                        <FlaskConical className="h-3.5 w-3.5" />A/B Test
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Recent insights */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Historique des insights ({insights.length})</h2>
          {insightsLoading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Chargement...</CardContent></Card>
          ) : insights.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center space-y-3">
                <Brain className="h-12 w-12 text-muted-foreground/20 mx-auto" />
                <p className="text-muted-foreground">Aucun insight encore. Lancez l'analyse IA.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {insights.slice(0, 20).map(insight => {
                const cfg = INSIGHT_CONFIG[insight.insight_type] || INSIGHT_CONFIG.landing_weak;
                const Icon = cfg.icon;
                const relatedActions = actions.filter(a => a.insight_id === insight.id);
                return (
                  <Card key={insight.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                        <Badge variant={cfg.badgeVariant} className="text-[10px]">{cfg.label}</Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {new Date(insight.created_at).toLocaleDateString("fr-CA")}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{insight.metric_type}</span>
                          <span className="font-medium">{(insight.metric_value * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={insight.confidence_score * 100} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground">
                          Confiance: {Math.round(insight.confidence_score * 100)}%
                          {insight.feature && ` • Feature: ${insight.feature}`}
                          {insight.city && ` • Ville: ${insight.city}`}
                        </p>
                      </div>
                      {relatedActions.length > 0 && (
                        <div className="mt-2 flex gap-1.5 flex-wrap">
                          {relatedActions.map(a => (
                            <Badge
                              key={a.id}
                              variant={a.status === "applied" ? "default" : a.status === "ignored" ? "secondary" : "outline"}
                              className="text-[9px]"
                            >
                              {a.status === "applied" ? "✓ " : a.status === "ignored" ? "✗ " : "⏳ "}
                              {ACTION_LABELS[a.action_type] || a.action_type}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Applied actions summary */}
        {appliedActions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                Actions appliquées ({appliedActions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {appliedActions.slice(0, 10).map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <Badge variant="default" className="text-[10px]">{ACTION_LABELS[a.action_type] || a.action_type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {a.applied_at ? new Date(a.applied_at).toLocaleString("fr-CA") : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
