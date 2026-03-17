/**
 * UNPRO — Premium AI Growth Dashboard (Licorne UI)
 * Dark glass UI with insights, funnel visualization, placement performance, reward tuning.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Brain, TrendingUp, AlertTriangle, Rocket, Target, Zap, BarChart3,
  ArrowRight, Loader2, RefreshCw, Check, X, FlaskConical,
  Truck, Building2, CreditCard, Signpost, Share2, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

/* ─── Types ─── */
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
  old_value: any;
  new_value: any;
  status: string;
  applied_at: string | null;
  created_at: string;
}

/* ─── Config ─── */
const INSIGHT_STYLE: Record<string, { icon: React.ElementType; gradient: string; label: string; emoji: string }> = {
  landing_weak: { icon: AlertTriangle, gradient: "from-amber-500/20 to-orange-500/10", label: "Opportunité", emoji: "🚨" },
  auth_friction: { icon: AlertTriangle, gradient: "from-red-500/20 to-rose-500/10", label: "Friction", emoji: "⚠️" },
  high_performer: { icon: Rocket, gradient: "from-emerald-500/20 to-green-500/10", label: "Top performer", emoji: "🚀" },
  placement_underperforming: { icon: Target, gradient: "from-orange-500/20 to-amber-500/10", label: "Placement faible", emoji: "🎯" },
  reward_opportunity: { icon: Zap, gradient: "from-violet-500/20 to-purple-500/10", label: "Récompense", emoji: "⚡" },
  scaling_opportunity: { icon: TrendingUp, gradient: "from-blue-500/20 to-cyan-500/10", label: "Scaling", emoji: "📈" },
};

const ACTION_LABELS: Record<string, string> = {
  increase_reward: "Augmenter récompense",
  decrease_reward: "Réduire récompense",
  boost_placement_visibility: "Booster visibilité",
  change_bundle_order: "Réordonner bundle",
  switch_default_feature: "Changer feature défaut",
  enable_ab_test: "Lancer A/B test",
};

const PLACEMENT_ICONS: Record<string, React.ElementType> = {
  truck_wrap: Truck,
  condo_lobby: Building2,
  business_card: CreditCard,
  yard_sign: Signpost,
  social_ad: Share2,
};

export default function AdminAIGrowthDashboard() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [rewardIntensity, setRewardIntensity] = useState([50]);

  /* ─── Data ─── */
  const { data: insights = [] } = useQuery({
    queryKey: ["ai-insights-premium"],
    queryFn: async () => {
      const { data } = await supabase.from("optimization_insights" as any).select("*").order("created_at", { ascending: false }).limit(50);
      return (data || []) as unknown as Insight[];
    },
  });

  const { data: actions = [] } = useQuery({
    queryKey: ["ai-actions-premium"],
    queryFn: async () => {
      const { data } = await supabase.from("optimization_actions" as any).select("*").order("created_at", { ascending: false }).limit(100);
      return (data || []) as unknown as Action[];
    },
  });

  const { data: funnel } = useQuery({
    queryKey: ["funnel-premium"],
    queryFn: async () => {
      const ev = supabase.from("deep_link_events" as any);
      const [s, v, c, a, f] = await Promise.all([
        ev.select("id", { count: "exact", head: true }).eq("event_type", "qr_scanned"),
        ev.select("id", { count: "exact", head: true }).eq("event_type", "landing_viewed"),
        ev.select("id", { count: "exact", head: true }).eq("event_type", "cta_clicked"),
        ev.select("id", { count: "exact", head: true }).eq("event_type", "auth_completed"),
        ev.select("id", { count: "exact", head: true }).eq("event_type", "feature_completed"),
      ]);
      return [
        { label: "Scan", value: s.count || 0, key: "scan" },
        { label: "Landing", value: v.count || 0, key: "view" },
        { label: "CTA", value: c.count || 0, key: "cta" },
        { label: "Login", value: a.count || 0, key: "auth" },
        { label: "Completion", value: f.count || 0, key: "complete" },
      ];
    },
  });

  const { data: placements = [] } = useQuery({
    queryKey: ["placements-perf"],
    queryFn: async () => {
      const { data } = await supabase.from("qr_placements" as any).select("*").eq("is_active", true).limit(20);
      return (data || []) as any[];
    },
  });

  /* ─── Mutations ─── */
  const runOptimizer = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("growth-optimizer");
      if (error) throw error;
      toast.success(`${data?.insightCount || 0} insights générés`);
      qc.invalidateQueries({ queryKey: ["ai-insights-premium"] });
      qc.invalidateQueries({ queryKey: ["ai-actions-premium"] });
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setRunning(false);
    }
  };

  const applyAction = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("optimization_actions" as any).update({ status: "applied", applied_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-actions-premium"] }); toast.success("Appliqué"); },
  });

  const ignoreAction = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("optimization_actions" as any).update({ status: "ignored" }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-actions-premium"] }); },
  });

  const pendingActions = actions.filter(a => a.status === "pending");
  const topInsights = insights.slice(0, 6);
  const funnelSteps = funnel || [];

  return (
    <div className="min-h-screen bg-[hsl(228,33%,4%)] text-[hsl(220,20%,93%)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20 flex items-center justify-center">
              <Brain className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AI Growth Engine</h1>
              <p className="text-sm text-[hsl(220,14%,50%)]">Optimisation en temps réel</p>
            </div>
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="ml-2 flex items-center gap-1.5"
            >
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-medium">actif</span>
            </motion.div>
          </div>
          <Button
            onClick={runOptimizer}
            disabled={running}
            className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-0 text-white shadow-[0_0_20px_-4px_hsl(260,70%,50%/0.4)]"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {running ? "Analyse..." : "Lancer l'IA"}
          </Button>
        </motion.div>

        {/* ── Section 1: Insight Cards (scrollable) ── */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[hsl(220,14%,50%)] uppercase tracking-wider">Insights</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {topInsights.length === 0 && (
              <div className="flex-shrink-0 w-72 bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl p-5 text-center">
                <Brain className="h-8 w-8 text-[hsl(220,14%,50%)]/30 mx-auto mb-2" />
                <p className="text-sm text-[hsl(220,14%,50%)]">Lancez l'IA pour générer des insights</p>
              </div>
            )}
            {topInsights.map((ins, i) => {
              const cfg = INSIGHT_STYLE[ins.insight_type] || INSIGHT_STYLE.landing_weak;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={ins.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex-shrink-0 w-72 bg-gradient-to-br ${cfg.gradient} border border-[hsl(228,18%,13%)] rounded-2xl p-5 space-y-3 hover:border-[hsl(228,18%,20%)] transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cfg.emoji}</span>
                    <Badge className="bg-[hsl(228,25%,7%)]/60 text-[hsl(220,20%,93%)] border-0 text-[10px]">{cfg.label}</Badge>
                  </div>
                  <p className="text-sm font-medium leading-snug">
                    {ins.feature && <span className="capitalize">{ins.feature}</span>}
                    {ins.city && <span> — {ins.city}</span>}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[hsl(220,14%,50%)]">{ins.metric_type}:</span>
                    <span className="text-sm font-bold">{(ins.metric_value * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex gap-1.5">
                    {pendingActions.filter(a => a.insight_id === ins.id).map(a => (
                      <Button
                        key={a.id}
                        size="sm"
                        className="text-[10px] h-7 rounded-lg bg-[hsl(228,25%,7%)]/80 hover:bg-[hsl(228,25%,12%)] text-[hsl(220,20%,93%)] border border-[hsl(228,18%,16%)]"
                        onClick={() => applyAction.mutate(a.id)}
                      >
                        {ACTION_LABELS[a.action_type] || a.action_type}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Section 2: Funnel Visualization ── */}
        <div className="bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[hsl(220,14%,50%)] uppercase tracking-wider mb-6">Funnel</h2>
          <div className="flex items-center justify-between gap-2">
            {funnelSteps.map((step, i) => {
              const rate = i > 0 && funnelSteps[i - 1].value > 0
                ? Math.round((step.value / funnelSteps[i - 1].value) * 100)
                : 100;
              const color = rate > 60 ? "text-emerald-400" : rate > 30 ? "text-amber-400" : "text-red-400";
              const barColor = rate > 60 ? "bg-emerald-500/30" : rate > 30 ? "bg-amber-500/30" : "bg-red-500/30";

              return (
                <div key={step.key} className="flex items-center gap-2 flex-1">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex-1 text-center"
                  >
                    <div className="h-16 flex items-end justify-center mb-2">
                      <motion.div
                        className={`w-full max-w-[48px] rounded-t-lg ${barColor}`}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(rate * 0.64, 8)}px` }}
                        transition={{ delay: i * 0.1, duration: 0.5 }}
                      />
                    </div>
                    <p className="text-xl font-bold">{step.value}</p>
                    <p className="text-[10px] text-[hsl(220,14%,50%)]">{step.label}</p>
                    {i > 0 && (
                      <p className={`text-[10px] font-semibold ${color}`}>{rate}%</p>
                    )}
                  </motion.div>
                  {i < funnelSteps.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-[hsl(228,18%,20%)] shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section 3 + 4: Placements + Reward Tuning ── */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Placements */}
          <div className="bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[hsl(220,14%,50%)] uppercase tracking-wider">Placements</h2>
            {placements.length === 0 ? (
              <p className="text-sm text-[hsl(220,14%,50%)]">Aucun placement actif</p>
            ) : (
              <div className="space-y-3">
                {placements.slice(0, 5).map((p: any) => {
                  const PlIcon = PLACEMENT_ICONS[p.placement_type] || Signpost;
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(228,25%,10%)]/60 border border-[hsl(228,18%,15%)] hover:border-[hsl(228,18%,22%)] transition-colors">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
                        <PlIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name || p.placement_type}</p>
                        <p className="text-[10px] text-[hsl(220,14%,50%)]">{p.placement_type}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[hsl(220,14%,50%)]/40" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reward Tuning */}
          <div className="bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl p-6 space-y-6">
            <h2 className="text-sm font-semibold text-[hsl(220,14%,50%)] uppercase tracking-wider">Reward Intensity</h2>
            <div className="space-y-4">
              <Slider
                value={rewardIntensity}
                onValueChange={setRewardIntensity}
                max={100}
                step={1}
                className="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-violet-500 [&_[role=slider]]:to-fuchsia-500 [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-[0_0_12px_-2px_hsl(260,70%,50%/0.5)]"
              />
              <div className="flex justify-between text-[10px] text-[hsl(220,14%,50%)]">
                <span>Low</span>
                <span className="text-violet-400 font-semibold">{rewardIntensity[0]}%</span>
                <span>Aggressive</span>
              </div>
              <p className="text-xs text-[hsl(220,14%,50%)] leading-relaxed">
                {rewardIntensity[0] < 30 && "Mode conservateur — récompenses minimales, focus rentabilité."}
                {rewardIntensity[0] >= 30 && rewardIntensity[0] < 70 && "Mode équilibré — balance entre conversion et coût."}
                {rewardIntensity[0] >= 70 && "Mode agressif — récompenses élevées, focus croissance maximale."}
              </p>
            </div>
          </div>
        </div>

        {/* ── Section 5: Action Panel ── */}
        <div className="bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[hsl(220,14%,50%)] uppercase tracking-wider mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={runOptimizer}
              disabled={running}
              className="gap-2 bg-gradient-to-r from-violet-600/80 to-fuchsia-600/80 hover:from-violet-500 hover:to-fuchsia-500 border-0 text-white"
            >
              <Brain className="h-4 w-4" />Appliquer suggestions IA
            </Button>
            <Button variant="outline" className="gap-2 border-[hsl(228,18%,16%)] text-[hsl(220,20%,93%)] bg-transparent hover:bg-[hsl(228,25%,10%)]">
              <FlaskConical className="h-4 w-4" />Lancer A/B test
            </Button>
            <Button variant="outline" className="gap-2 border-[hsl(228,18%,16%)] text-[hsl(220,20%,93%)] bg-transparent hover:bg-[hsl(228,25%,10%)]">
              <Rocket className="h-4 w-4" />Créer campagne
            </Button>
          </div>

          {/* Pending actions list */}
          {pendingActions.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-xs text-[hsl(220,14%,50%)]">{pendingActions.length} actions en attente</p>
              {pendingActions.slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(228,25%,10%)]/60 border border-[hsl(228,18%,15%)]">
                  <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-sm flex-1">{ACTION_LABELS[a.action_type] || a.action_type}</span>
                  <Button size="sm" className="h-7 text-[10px] gap-1 bg-emerald-600/80 hover:bg-emerald-500 border-0" onClick={() => applyAction.mutate(a.id)}>
                    <Check className="h-3 w-3" />Appliquer
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] text-[hsl(220,14%,50%)]" onClick={() => ignoreAction.mutate(a.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
