/**
 * UNPRO — Admin Plan Appointments Control Page
 * Full dashboard for plan quotas, included appointments, profitability.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, TrendingUp, Layers, BarChart3, Zap } from "lucide-react";
import TablePlanIncludedAppointments from "@/components/appointments/TablePlanIncludedAppointments";
import TableExtraAppointmentPricingMatrix from "@/components/appointments/TableExtraAppointmentPricingMatrix";
import TablePlanProfitabilityMatrix from "@/components/appointments/TablePlanProfitabilityMatrix";
import { PLAN_ORDER, PLAN_PRICES, INCLUDED_APPOINTMENTS, BASE_EXTRA_PRICES, buildProfitabilityMatrix } from "@/services/appointmentEconomicsEngine";

type Tab = "quotas" | "extra" | "profitability";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "quotas", label: "Quotas inclus", icon: CalendarDays },
  { key: "extra", label: "Tarification extra", icon: Zap },
  { key: "profitability", label: "Rentabilité", icon: BarChart3 },
];

export default function PageAdminPlanAppointmentsControl() {
  const [tab, setTab] = useState<Tab>("quotas");

  const totalMonthlyAppointments = PLAN_ORDER.reduce((s, p) => s + INCLUDED_APPOINTMENTS[p].appointments, 0);
  const totalMonthlyUnits = PLAN_ORDER.reduce((s, p) => s + INCLUDED_APPOINTMENTS[p].units, 0);
  const avgRevenuePerUnit = PLAN_ORDER.reduce((s, p) => s + PLAN_PRICES[p], 0) / totalMonthlyUnits;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <main className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="font-display text-xl font-bold text-foreground">Rendez-vous & Quotas</h1>
            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">Admin</span>
          </div>
          <p className="text-sm text-muted-foreground">Quotas inclus, tarification extra, rentabilité par plan</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Plans actifs", value: PLAN_ORDER.length, icon: Layers, color: "text-primary" },
            { label: "RDV inclus total", value: totalMonthlyAppointments, icon: CalendarDays, color: "text-emerald-400" },
            { label: "Unités total", value: totalMonthlyUnits.toFixed(0), icon: Zap, color: "text-amber-400" },
            { label: "Moy $/unité", value: `${avgRevenuePerUnit.toFixed(0)}$`, icon: TrendingUp, color: "text-primary" },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-xl border border-border/30 bg-card/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              </div>
              <p className={`text-2xl font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
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
          className="space-y-5"
        >
          {tab === "quotas" && (
            <>
              <TablePlanIncludedAppointments />
              {/* Size consumption reference */}
              <div className="rounded-xl border border-border/30 bg-card/50 p-5">
                <h3 className="text-sm font-semibold mb-3">Consommation par taille de projet</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(["xs", "s", "m", "l", "xl", "xxl"] as const).map(size => (
                    <div key={size} className="text-center p-3 rounded-lg border border-border/20 bg-muted/5">
                      <span className="text-xs font-bold text-primary uppercase">{size}</span>
                      <p className="text-lg font-bold font-mono text-foreground mt-1">
                        {({ xs: "0.5", s: "1.0", m: "1.5", l: "2.0", xl: "3.0", xxl: "5.0" })[size]}
                      </p>
                      <p className="text-[10px] text-muted-foreground">unités</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {tab === "extra" && <TableExtraAppointmentPricingMatrix />}
          {tab === "profitability" && <TablePlanProfitabilityMatrix />}
        </motion.div>

        {/* Rules */}
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
          <p className="text-xs font-semibold text-amber-400 mb-1">Règles de facturation</p>
          <ul className="text-[10px] text-muted-foreground space-y-0.5">
            <li>• Quota réinitialisé chaque cycle de facturation</li>
            <li>• Extra facturé à partir de l'état "confirmed"</li>
            <li>• Taille non couverte = accès bloqué + upgrade requis</li>
            <li>• Upgrade recommandé si overage ≥ 85% du différentiel</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
