/**
 * UNPRO — Admin Zone Value Map Page
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { MapPin, Crown, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/layouts/AdminLayout";
import TableZoneProfitability from "@/components/zone-value/TableZoneProfitability";
import WidgetZoneValueScore from "@/components/zone-value/WidgetZoneValueScore";
import CardZoneExclusivity from "@/components/zone-value/CardZoneExclusivity";
import AdminFeedbackHealthPanel from "@/components/feedback-loop/AdminFeedbackHealthPanel";
import { computeVarianceReport, type PredictionOutcomePair } from "@/lib/feedbackLoopEngine";
import { formatCentsCAD } from "@/lib/zoneValueScoring";

function useZoneScores() {
  return useQuery({
    queryKey: ["admin-zone-scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_zone_scores")
        .select("*")
        .order("zone_value_score", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useExclusivityOffers() {
  return useQuery({
    queryKey: ["admin-zone-exclusivity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_zone_exclusivity")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useFeedbackPairs() {
  return useQuery({
    queryKey: ["admin-feedback-pairs"],
    queryFn: async () => {
      const { data: outcomes, error: oErr } = await supabase
        .from("contractor_outcomes")
        .select("*, market_leads!contractor_outcomes_lead_id_fkey(market_lead_predictions(*))")
        .limit(200);
      if (oErr) throw oErr;
      if (!outcomes?.length) return [];

      return outcomes.map((o: any): PredictionOutcomePair => {
        const pred = o.market_leads?.market_lead_predictions?.[0];
        return {
          leadId: o.lead_id || "",
          predictedValue: pred?.predicted_contract_value || 0,
          actualValue: o.actual_contract_value_cents,
          predictedCloseProb: pred?.predicted_close_probability || 0,
          didClose: o.did_close,
          predictedTimeToClose: pred?.predicted_time_to_close_days || 14,
          actualTimeToClose: o.actual_time_to_close_days,
          predictedShowProb: pred?.predicted_show_probability || 0.7,
          didShow: o.did_show,
        };
      });
    },
  });
}

export default function AdminZoneValueMap() {
  const { data: zones, isLoading: zonesLoading, error } = useZoneScores();
  const { data: exclusivity, isLoading: exLoading } = useExclusivityOffers();
  const { data: pairs, isLoading: pairsLoading } = useFeedbackPairs();

  const topZones = useMemo(() => (zones || []).slice(0, 3), [zones]);
  const eligibleCount = useMemo(() => (zones || []).filter((z: any) => z.exclusivity_eligible).length, [zones]);
  const totalRevenue = useMemo(() => (zones || []).reduce((s: number, z: any) => s + (z.revenue_projection_monthly_cents || 0), 0), [zones]);

  const feedbackReport = useMemo(() => {
    if (!pairs?.length) return null;
    return computeVarianceReport(pairs);
  }, [pairs]);

  const isLoading = zonesLoading || exLoading;

  if (error) {
    return (
      <AdminLayout>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive font-medium">Erreur de chargement</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="font-display text-xl font-bold text-foreground">Valeur de Zone & Exclusivité</h1>
            <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 text-[10px] font-semibold">Engine</span>
          </div>
          <p className="text-sm text-muted-foreground">Scoring territorial · Exclusivité · Feedback prédictif</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Zones scorées", value: zones?.length || 0, icon: MapPin, color: "text-primary" },
            { label: "Éligibles exclusivité", value: eligibleCount, icon: Crown, color: "text-violet-400" },
            { label: "Revenu projeté total/mois", value: formatCentsCAD(totalRevenue), icon: TrendingUp, color: "text-emerald-400" },
            { label: "Offres actives", value: exclusivity?.filter((e: any) => e.status === "claimed").length || 0, icon: Activity, color: "text-blue-400" },
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

        {/* Top zone scores */}
        {topZones.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {topZones.map((z: any) => (
              <WidgetZoneValueScore
                key={z.id}
                score={z.zone_value_score}
                citySlug={z.city_slug}
                tradeSlug={z.trade_slug}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}

        {/* Exclusivity cards for top eligible */}
        {topZones.filter((z: any) => z.exclusivity_eligible).length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {topZones.filter((z: any) => z.exclusivity_eligible).slice(0, 2).map((z: any) => {
              const offer = exclusivity?.find((e: any) => e.city_slug === z.city_slug && e.trade_slug === z.trade_slug);
              return (
                <CardZoneExclusivity
                  key={z.id}
                  eligible
                  premiumCents={z.suggested_premium_cents || 0}
                  revenueProjectionCents={z.revenue_projection_monthly_cents || 0}
                  citySlug={z.city_slug}
                  tradeSlug={z.trade_slug}
                  status={offer?.status}
                />
              );
            })}
          </div>
        )}

        {/* Feedback Loop Health */}
        <AdminFeedbackHealthPanel report={feedbackReport} isLoading={pairsLoading} />

        {/* Full zone table */}
        <TableZoneProfitability zones={zones || []} isLoading={isLoading} />
      </div>
    </AdminLayout>
  );
}
