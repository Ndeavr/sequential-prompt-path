/**
 * UNPRO — Admin Dynamic Market Pricing Dashboard
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { DollarSign, Activity, TrendingUp, AlertTriangle, RefreshCw, MapPin, Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import CardDynamicPriceBreakdown from "@/components/market-pricing/CardDynamicPriceBreakdown";
import WidgetMarketSignalsPanel from "@/components/market-pricing/WidgetMarketSignalsPanel";
import WidgetDemandHeatmapLive from "@/components/market-pricing/WidgetDemandHeatmapLive";

export default function AdminDynamicMarketPricing() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: prices, isLoading: pricesLoading, refetch: refetchPrices } = useQuery({
    queryKey: ["market-dynamic-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_dynamic_prices")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: signals, isLoading: signalsLoading, refetch: refetchSignals } = useQuery({
    queryKey: ["market-signal-snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_signal_snapshots")
        .select("*")
        .order("snapshot_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleRefreshSignals = async () => {
    setRefreshing(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await supabase.functions.invoke("market-refresh-market-signals", { body: {} });
      if (res.error) throw res.error;
      toast.success(`${res.data?.refreshed || 0} signaux rafraîchis`);
      refetchSignals();
      refetchPrices();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors du rafraîchissement");
    } finally {
      setRefreshing(false);
    }
  };

  // KPIs
  const avgPrice = prices?.length
    ? Math.round(prices.reduce((s, p) => s + (p.final_price_cents || 0), 0) / prices.length)
    : 0;
  const avgConfidence = prices?.length
    ? Math.round(prices.reduce((s, p) => s + (p.confidence_score || 0), 0) / prices.length)
    : 0;
  const surgeCount = prices?.filter(p => (p.combined_multiplier || 1) > 1.3).length || 0;
  const fallbackCount = prices?.filter(p => p.fallback_used).length || 0;

  const isLoading = pricesLoading || signalsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Prix Dynamique Marché</h1>
          <p className="text-sm text-muted-foreground">BasePrice = Google CPL × (1 + Markup%) × multiplicateurs marché</p>
        </div>
        <Button
          size="sm"
          onClick={handleRefreshSignals}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Rafraîchir signaux
        </Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Prix moyen", value: `${(avgPrice / 100).toFixed(0)} $`, icon: DollarSign, color: "text-primary" },
          { label: "Confiance moy.", value: `${avgConfidence}%`, icon: Activity, color: "text-emerald-400" },
          { label: "Surge actifs", value: surgeCount, icon: Flame, color: "text-orange-400" },
          { label: "Fallback utilisés", value: fallbackCount, icon: AlertTriangle, color: "text-yellow-400" },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border/30 bg-card/60 p-4"
          >
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Demand Heatmap */}
      <WidgetDemandHeatmapLive signals={signals || []} isLoading={signalsLoading} />

      {/* Market Signals */}
      <WidgetMarketSignalsPanel signals={signals || []} isLoading={signalsLoading} />

      {/* Price Breakdown Cards */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Derniers prix calculés</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
          </div>
        ) : !prices?.length ? (
          <div className="rounded-2xl border border-border/30 bg-card/40 p-8 text-center">
            <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun prix calculé encore.</p>
            <p className="text-xs text-muted-foreground mt-1">Rafraîchissez les signaux puis lancez un calcul de prix.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prices.map((price, i) => (
              <CardDynamicPriceBreakdown key={price.id} price={price} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
