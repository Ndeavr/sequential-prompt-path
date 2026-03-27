/**
 * AdminSalesAnalyticsPage — Sales voice funnel analytics for Alex.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Target, AlertTriangle, DollarSign, Users } from "lucide-react";

interface FunnelMetrics {
  totalSessions: number;
  diagnosticCompleted: number;
  projectionShown: number;
  planRecommended: number;
  checkoutOpened: number;
  paid: number;
  topObjections: { type: string; count: number }[];
  topPlans: { plan: string; count: number }[];
}

export default function AdminSalesAnalyticsPage() {
  const [metrics, setMetrics] = useState<FunnelMetrics>({
    totalSessions: 0, diagnosticCompleted: 0, projectionShown: 0,
    planRecommended: 0, checkoutOpened: 0, paid: 0,
    topObjections: [], topPlans: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: sessions } = await supabase
        .from("alex_sales_sessions")
        .select("id, current_step, recommended_plan, selected_plan, checkout_ready, paid")
        .limit(1000);

      const { data: objections } = await supabase
        .from("alex_sales_objections")
        .select("objection_type")
        .limit(1000);

      const s = sessions || [];
      const o = objections || [];

      const objMap = new Map<string, number>();
      o.forEach(obj => objMap.set(obj.objection_type, (objMap.get(obj.objection_type) || 0) + 1));

      const planMap = new Map<string, number>();
      s.forEach(sess => {
        if (sess.recommended_plan) planMap.set(sess.recommended_plan, (planMap.get(sess.recommended_plan) || 0) + 1);
      });

      setMetrics({
        totalSessions: s.length,
        diagnosticCompleted: s.filter(x => x.current_step !== "greeting" && x.current_step !== "ask_service").length,
        projectionShown: s.filter(x => x.recommended_plan).length,
        planRecommended: s.filter(x => x.recommended_plan).length,
        checkoutOpened: s.filter(x => x.checkout_ready).length,
        paid: s.filter(x => x.paid).length,
        topObjections: [...objMap.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 5),
        topPlans: [...planMap.entries()].map(([plan, count]) => ({ plan, count })).sort((a, b) => b.count - a.count),
      });
      setLoading(false);
    }
    load();
  }, []);

  const cards = [
    { icon: Users, label: "Sessions", value: metrics.totalSessions, color: "text-primary" },
    { icon: Target, label: "Diagnostic complété", value: metrics.diagnosticCompleted, color: "text-primary" },
    { icon: TrendingUp, label: "Projection affichée", value: metrics.projectionShown, color: "text-primary" },
    { icon: BarChart3, label: "Plan recommandé", value: metrics.planRecommended, color: "text-primary" },
    { icon: DollarSign, label: "Checkout ouvert", value: metrics.checkoutOpened, color: "text-green-600" },
    { icon: DollarSign, label: "Payé", value: metrics.paid, color: "text-green-600" },
  ];

  const convRate = (from: number, to: number) => from > 0 ? `${((to / from) * 100).toFixed(1)}%` : "—";

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Chargement des analytics…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Analytics Sales — Alex</h1>

      {/* Funnel cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <c.icon className={`w-5 h-5 ${c.color} mb-2`} />
            <div className="text-2xl font-bold text-foreground">{c.value}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Conversion funnel */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Taux de conversion</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Session → Diagnostic</span><span className="font-medium">{convRate(metrics.totalSessions, metrics.diagnosticCompleted)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Diagnostic → Projection</span><span className="font-medium">{convRate(metrics.diagnosticCompleted, metrics.projectionShown)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Projection → Checkout</span><span className="font-medium">{convRate(metrics.projectionShown, metrics.checkoutOpened)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Checkout → Paiement</span><span className="font-medium">{convRate(metrics.checkoutOpened, metrics.paid)}</span></div>
        </div>
      </div>

      {/* Top objections */}
      {metrics.topObjections.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Objections fréquentes
          </h2>
          <div className="space-y-2">
            {metrics.topObjections.map(o => (
              <div key={o.type} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{o.type.replace(/_/g, " ")}</span>
                <span className="font-medium text-foreground">{o.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top plans */}
      {metrics.topPlans.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Plans les plus recommandés</h2>
          <div className="space-y-2">
            {metrics.topPlans.map(p => (
              <div key={p.plan} className="flex justify-between text-sm">
                <span className="text-muted-foreground capitalize">{p.plan}</span>
                <span className="font-medium text-foreground">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
