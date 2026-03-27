/**
 * Revenue Trend Chart — Monthly revenue visualization with comparison
 */
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, ArrowUpRight } from "lucide-react";
import { useWeeklyAppointmentStats } from "@/hooks/useContractorDashboardData";

export default function DashRevenueChart() {
  const { data: stats } = useWeeklyAppointmentStats();

  const weeks = stats?.weeks ?? Array.from({ length: 8 }, (_, i) => ({
    label: `S${i + 1}`,
    total: 0,
    completed: 0,
    revenue: 0,
  }));

  const totalRevenue = weeks.reduce((s, w) => s + w.revenue, 0);
  const prevHalf = weeks.slice(0, 4).reduce((s, w) => s + w.revenue, 0);
  const currHalf = weeks.slice(4).reduce((s, w) => s + w.revenue, 0);
  const growth = prevHalf > 0 ? Math.round(((currHalf - prevHalf) / prevHalf) * 100) : 0;
  const maxRev = Math.max(...weeks.map(w => w.revenue), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.48 }}
      className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-accent" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Revenus estimés</span>
        </div>
        {growth !== 0 && (
          <div className={`flex items-center gap-1 text-[10px] font-bold ${growth > 0 ? "text-success" : "text-destructive"}`}>
            <ArrowUpRight className={`w-3 h-3 ${growth < 0 ? "rotate-90" : ""}`} />
            {growth > 0 ? "+" : ""}{growth}%
          </div>
        )}
      </div>

      {/* Total */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">
          {totalRevenue > 0 ? `${(totalRevenue / 100).toLocaleString("fr-CA", { minimumFractionDigits: 0 })} $` : "—"}
        </span>
        <span className="text-[10px] text-muted-foreground">8 dernières semaines</span>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1.5 h-16">
        {weeks.map((w, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <motion.div
              className="w-full rounded-sm bg-gradient-to-t from-accent to-accent/60"
              initial={{ height: 0 }}
              animate={{ height: `${(w.revenue / maxRev) * 100}%` }}
              transition={{ delay: 0.5 + i * 0.05, duration: 0.4 }}
              style={{ minHeight: w.revenue > 0 ? 4 : 0 }}
            />
            <span className="text-[8px] text-muted-foreground">{w.label}</span>
          </div>
        ))}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/20">
        <div className="text-center">
          <p className="text-xs font-bold text-foreground">{stats?.completedAppointments ?? 0}</p>
          <p className="text-[9px] text-muted-foreground">Complétés</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-foreground">
            {stats?.completedAppointments ? `${((stats.completedAppointments * 8500) / 100).toLocaleString("fr-CA")} $` : "—"}
          </p>
          <p className="text-[9px] text-muted-foreground">Valeur totale</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-foreground">
            {stats?.completedAppointments ? `${Math.round(8500 / 100)} $` : "—"}
          </p>
          <p className="text-[9px] text-muted-foreground">Moy./RDV</p>
        </div>
      </div>
    </motion.div>
  );
}