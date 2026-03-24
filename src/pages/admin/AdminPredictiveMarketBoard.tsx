/**
 * UNPRO — AdminPredictiveMarketBoard
 * Centre de contrôle prédictif marché
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Brain, TrendingUp, AlertTriangle, DollarSign, Filter,
  Activity, Shield, Zap, Target, BarChart3,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import TablePriorityLeadQueue from "@/components/predictive-board/TablePriorityLeadQueue";
import AdminPredictionHealthPanel from "@/components/predictive-board/AdminPredictionHealthPanel";
import AdminMarketControlPanel from "@/components/predictive-board/AdminMarketControlPanel";
import WidgetLeadPriorityMeter from "@/components/predictive-board/WidgetLeadPriorityMeter";
import WidgetRoutingConfidence from "@/components/predictive-board/WidgetRoutingConfidence";

// ─── Data hooks ───
function useMarketBoard() {
  return useQuery({
    queryKey: ["admin-predictive-market-board"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_leads")
        .select("*, market_lead_predictions(*), market_lead_risk_scores(*), market_next_best_actions(*)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useDynamicPricesLatest() {
  return useQuery({
    queryKey: ["admin-board-dynamic-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_dynamic_prices")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

export default function AdminPredictiveMarketBoard() {
  const { data: leads, isLoading: leadsLoading, error: leadsError } = useMarketBoard();
  const { data: prices, isLoading: pricesLoading } = useDynamicPricesLatest();

  // Filters
  const [cityFilter, setCityFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [scoreMin, setScoreMin] = useState(0);

  const cities = useMemo(() => {
    if (!leads) return [];
    return [...new Set(leads.map((l: any) => l.city_slug).filter(Boolean))].sort();
  }, [leads]);

  const enriched = useMemo(() => {
    if (!leads) return [];
    return leads
      .map((lead: any) => {
        const pred = Array.isArray(lead.market_lead_predictions) ? lead.market_lead_predictions[0] : lead.market_lead_predictions;
        const risk = Array.isArray(lead.market_lead_risk_scores) ? lead.market_lead_risk_scores[0] : lead.market_lead_risk_scores;
        const action = Array.isArray(lead.market_next_best_actions) ? lead.market_next_best_actions[0] : lead.market_next_best_actions;
        const price = prices?.find((p: any) => p.city_slug === lead.city_slug && p.trade_slug === lead.trade_slug);
        return { ...lead, pred, risk, action, price };
      })
      .filter((l: any) => {
        if (cityFilter !== "all" && l.city_slug !== cityFilter) return false;
        if (riskFilter !== "all" && (l.risk?.overall_risk_level || "medium") !== riskFilter) return false;
        if (l.pred?.predicted_lead_quality_score != null && l.pred.predicted_lead_quality_score < scoreMin) return false;
        return true;
      })
      .sort((a: any, b: any) => (b.pred?.predicted_routing_priority || 0) - (a.pred?.predicted_routing_priority || 0));
  }, [leads, prices, cityFilter, riskFilter, scoreMin]);

  // KPIs
  const kpis = useMemo(() => {
    const preds = enriched.filter((l: any) => l.pred);
    const total = preds.length || 1;
    return {
      totalLeads: enriched.length,
      avgQuality: Math.round(preds.reduce((s: number, l: any) => s + (l.pred?.predicted_lead_quality_score || 0), 0) / total),
      avgValue: Math.round(preds.reduce((s: number, l: any) => s + (l.pred?.predicted_contract_value || 0), 0) / total),
      avgConfidence: Math.round(preds.reduce((s: number, l: any) => s + (l.pred?.confidence_score || 0), 0) / total),
      highRisk: enriched.filter((l: any) => l.risk?.overall_risk_level === "high").length,
      avgCloseProb: Math.round(preds.reduce((s: number, l: any) => s + (l.pred?.predicted_close_probability || 0), 0) / total * 100),
    };
  }, [enriched]);

  const isLoading = leadsLoading || pricesLoading;

  if (leadsError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-sm text-destructive font-medium">Erreur de chargement du tableau de bord</p>
        <p className="text-xs text-muted-foreground mt-1">{(leadsError as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="font-display text-xl font-bold text-foreground">Centre Prédictif Marché</h1>
          <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">Live</span>
        </div>
        <p className="text-sm text-muted-foreground">File prioritaire · Prédictions · Prix dynamiques · Actions</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: "Leads", value: kpis.totalLeads, icon: Target, color: "text-primary" },
          { label: "Qualité moy.", value: `${kpis.avgQuality}/100`, icon: BarChart3, color: "text-emerald-400" },
          { label: "Valeur moy.", value: fmt(kpis.avgValue), icon: DollarSign, color: "text-primary" },
          { label: "Close prob.", value: `${kpis.avgCloseProb}%`, icon: TrendingUp, color: "text-blue-400" },
          { label: "Confiance", value: `${kpis.avgConfidence}%`, icon: Activity, color: "text-violet-400" },
          { label: "Risque élevé", value: kpis.highRisk, icon: AlertTriangle, color: "text-orange-400" },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl border border-border/30 bg-card/60 p-3"
          >
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                  <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Widgets row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WidgetLeadPriorityMeter leads={enriched} isLoading={isLoading} />
        <WidgetRoutingConfidence leads={enriched} isLoading={isLoading} />
      </div>

      {/* Health + Control */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdminPredictionHealthPanel leads={enriched} isLoading={isLoading} />
        <AdminMarketControlPanel prices={prices || []} isLoading={pricesLoading} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Ville" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {cities.map((c: string) => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Risque" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout risque</SelectItem>
            <SelectItem value="low">Faible</SelectItem>
            <SelectItem value="medium">Moyen</SelectItem>
            <SelectItem value="high">Élevé</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Score min</span>
          <Input
            type="number"
            className="w-16 h-8 text-xs"
            value={scoreMin}
            onChange={(e) => setScoreMin(Number(e.target.value))}
            min={0}
            max={100}
          />
        </div>
      </div>

      {/* Priority Queue Table */}
      <TablePriorityLeadQueue leads={enriched} isLoading={isLoading} />
    </div>
  );
}
