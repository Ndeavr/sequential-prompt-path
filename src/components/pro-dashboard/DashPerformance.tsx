/**
 * Performance charts — real weekly data from appointments
 */
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, DollarSign, Target } from "lucide-react";
import { useWeeklyAppointmentStats, useContractorScores } from "@/hooks/useContractorDashboardData";

export default function DashPerformance() {
  const { data: stats } = useWeeklyAppointmentStats();
  const { data: scores } = useContractorScores();

  const weeks = stats?.weeks ?? Array.from({ length: 8 }, (_, i) => ({
    label: `S${i + 1}`,
    total: 0,
    completed: 0,
    revenue: 0,
  }));

  const maxCount = Math.max(...weeks.map(w => w.total), 1);

  const totalRevenue = stats?.completedAppointments
    ? `${((stats.completedAppointments * 8500) / 1000).toFixed(0)}k $`
    : "—";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
      className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-4"
    >
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Performance</span>
      </div>

      {/* Weekly chart */}
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground">Rendez-vous par semaine</p>
        <div className="flex items-end gap-1.5 h-20">
          {weeks.map((w, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                className="w-full rounded-sm bg-gradient-to-t from-primary to-primary/60"
                initial={{ height: 0 }}
                animate={{ height: `${(w.total / maxCount) * 100}%` }}
                transition={{ delay: 0.8 + i * 0.05, duration: 0.4 }}
                style={{ minHeight: w.total > 0 ? 4 : 0 }}
              />
              <span className="text-[8px] text-muted-foreground">{w.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/20">
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">{stats?.totalAppointments ?? 0}</p>
          <p className="text-[9px] text-muted-foreground">Total RDV</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">{totalRevenue}</p>
          <p className="text-[9px] text-muted-foreground">Revenus estimés</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">
            {stats?.conversionRate != null ? `${stats.conversionRate}%` : "—"}
          </p>
          <p className="text-[9px] text-muted-foreground">Conversion</p>
        </div>
      </div>

      {/* Scores from feedback */}
      {scores && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20">
          {scores.avg_review_score != null && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/[0.05]">
              <TrendingUp className="w-3.5 h-3.5 text-success" />
              <div>
                <p className="text-xs font-bold text-foreground">{Number(scores.avg_review_score).toFixed(1)}/5</p>
                <p className="text-[9px] text-muted-foreground">Note moyenne</p>
              </div>
            </div>
          )}
          {scores.on_time_rate != null && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/[0.05]">
              <Target className="w-3.5 h-3.5 text-primary" />
              <div>
                <p className="text-xs font-bold text-foreground">{Math.round(Number(scores.on_time_rate))}%</p>
                <p className="text-[9px] text-muted-foreground">Ponctualité</p>
              </div>
            </div>
          )}
          {scores.recommendation_rate != null && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/[0.05]">
              <DollarSign className="w-3.5 h-3.5 text-accent" />
              <div>
                <p className="text-xs font-bold text-foreground">{Math.round(Number(scores.recommendation_rate))}%</p>
                <p className="text-[9px] text-muted-foreground">Recommandation</p>
              </div>
            </div>
          )}
          {scores.ranking_score != null && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/[0.05]">
              <BarChart3 className="w-3.5 h-3.5 text-secondary" />
              <div>
                <p className="text-xs font-bold text-foreground">{Math.round(Number(scores.ranking_score))}</p>
                <p className="text-[9px] text-muted-foreground">Ranking</p>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
