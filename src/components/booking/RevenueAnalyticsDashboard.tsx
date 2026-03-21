/**
 * Revenue analytics dashboard for contractors (Signature only)
 */
import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, BarChart3, Target, PieChart, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchBookingTransactions,
  computeRevenueAnalytics,
  formatCentsToCAD,
  type RevenueAnalytics,
} from "@/services/bookingRevenueEngine";

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 space-y-1.5 ${accent ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card"}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        <span className="text-meta text-muted-foreground">{label}</span>
      </div>
      <p className={`text-lg font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function RevenueAnalyticsDashboard() {
  const { session } = useAuth();
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data: c } = await supabase
        .from("contractors")
        .select("id")
        .eq("user_id", session.user.id)
        .single();
      if (!c) return;

      const txns = await fetchBookingTransactions(c.id);
      setAnalytics(computeRevenueAnalytics(txns));
      setLoading(false);
    })();
  }, [session?.user?.id]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-card p-4 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  const a = analytics ?? {
    totalRevenueCents: 0,
    totalUnproFeeCents: 0,
    totalContractorCents: 0,
    transactionCount: 0,
    avgBookingValueCents: 0,
    paidBookingCount: 0,
    freeBookingCount: 0,
    paidRatio: 0,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="text-body font-semibold text-foreground">Revenus & Performance</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={DollarSign}
          label="Revenus totaux"
          value={formatCentsToCAD(a.totalContractorCents)}
          sub={`${a.transactionCount} transaction${a.transactionCount > 1 ? "s" : ""}`}
          accent
        />
        <StatCard
          icon={TrendingUp}
          label="Valeur moyenne"
          value={formatCentsToCAD(a.avgBookingValueCents)}
          sub="par rendez-vous"
        />
        <StatCard
          icon={PieChart}
          label="Payants vs gratuits"
          value={`${a.paidBookingCount} / ${a.freeBookingCount}`}
          sub={`Ratio: ${Math.round(a.paidRatio * 100)}%`}
        />
        <StatCard
          icon={Target}
          label="Frais plateforme"
          value={formatCentsToCAD(a.totalUnproFeeCents)}
          sub="30% commission"
        />
        <StatCard
          icon={Zap}
          label="RV payants"
          value={String(a.paidBookingCount)}
          sub="Rendez-vous à valeur"
        />
        <StatCard
          icon={DollarSign}
          label="Net entrepreneur"
          value={formatCentsToCAD(a.totalContractorCents)}
          sub="Après commission"
          accent
        />
      </div>

      {a.transactionCount === 0 && (
        <div className="rounded-xl border border-border/40 bg-muted/20 p-6 text-center space-y-2">
          <p className="text-body text-muted-foreground">Aucune transaction pour le moment</p>
          <p className="text-meta text-muted-foreground">
            Activez des rendez-vous payants pour commencer à générer des revenus
          </p>
        </div>
      )}
    </div>
  );
}
