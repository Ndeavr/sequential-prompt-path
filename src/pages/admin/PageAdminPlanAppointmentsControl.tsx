/**
 * UNPRO — Admin Plan Appointments Control (Live Supabase Data)
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, TrendingUp, Layers, BarChart3, Zap, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanDefinitions, usePlanIncludedAppointments, useProjectSizes, usePlanProjectSizeAccess, useExtraPricingRules } from "@/hooks/useAppointmentEconomics";
import TablePlanIncludedAppointmentsLive from "@/components/appointments/TablePlanIncludedAppointmentsLive";
import TableExtraAppointmentPricingMatrixLive from "@/components/appointments/TableExtraAppointmentPricingMatrixLive";
import TablePlanProfitabilityMatrixLive from "@/components/appointments/TablePlanProfitabilityMatrixLive";

type Tab = "quotas" | "extra" | "profitability";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "quotas", label: "Quotas inclus", icon: CalendarDays },
  { key: "extra", label: "Tarification extra", icon: Zap },
  { key: "profitability", label: "Rentabilité", icon: BarChart3 },
];

export default function PageAdminPlanAppointmentsControl() {
  const [tab, setTab] = useState<Tab>("quotas");
  const { data: plans, isLoading: pl } = usePlanDefinitions();
  const { data: included, isLoading: il } = usePlanIncludedAppointments();
  const { data: sizes } = useProjectSizes();
  const { data: access } = usePlanProjectSizeAccess();
  const { data: pricing } = useExtraPricingRules();

  const loading = pl || il;

  const totalAppts = included?.reduce((s, p) => s + p.included_appointments_monthly, 0) ?? 0;
  const totalUnits = included?.reduce((s, p) => s + Number(p.included_units_monthly), 0) ?? 0;
  const totalRevenue = plans?.reduce((s, p) => s + p.base_price_monthly, 0) ?? 0;
  const avgPerUnit = totalUnits > 0 ? (totalRevenue / 100) / totalUnits : 0;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <main className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="font-display text-xl font-bold text-foreground">Rendez-vous & Quotas</h1>
              <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">Admin</span>
            </div>
            <p className="text-sm text-muted-foreground">Quotas inclus, tarification extra, rentabilité par plan — données live</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Plans actifs", value: plans?.length ?? 0, icon: Layers, color: "text-primary" },
            { label: "RDV inclus total", value: totalAppts, icon: CalendarDays, color: "text-emerald-400" },
            { label: "Unités total", value: totalUnits.toFixed(0), icon: Zap, color: "text-amber-400" },
            { label: "Moy $/unité", value: `${avgPerUnit.toFixed(0)}$`, icon: TrendingUp, color: "text-primary" },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-xl border border-border/30 bg-card/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              </div>
              <p className={`text-2xl font-bold font-mono ${kpi.color}`}>
                {loading ? "—" : kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                tab === t.key
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/20 border border-transparent"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "quotas" && (
            <TablePlanIncludedAppointmentsLive
              plans={plans ?? []}
              included={included ?? []}
              access={access ?? []}
              loading={loading}
            />
          )}
          {tab === "extra" && (
            <TableExtraAppointmentPricingMatrixLive
              pricing={pricing ?? []}
              loading={!pricing}
            />
          )}
          {tab === "profitability" && (
            <TablePlanProfitabilityMatrixLive
              plans={plans ?? []}
              included={included ?? []}
              loading={loading}
            />
          )}
        </motion.div>
      </main>
    </div>
  );
}
