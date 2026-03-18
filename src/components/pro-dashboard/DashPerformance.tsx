/**
 * Performance charts — appointments per week, revenue, conversion
 */
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

interface Props {
  appointments: { id: string; status: string; created_at: string }[];
}

export default function DashPerformance({ appointments }: Props) {
  // Generate last 8 weeks mock data
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const label = `S${8 - i}`;
    const count = Math.floor(Math.random() * 5);
    return { label, count };
  });
  const maxCount = Math.max(...weeks.map(w => w.count), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
      className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Performance</span>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground">Rendez-vous par semaine</p>
        <div className="flex items-end gap-1.5 h-20">
          {weeks.map((w, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                className="w-full rounded-sm bg-gradient-to-t from-primary to-primary/60"
                initial={{ height: 0 }}
                animate={{ height: `${(w.count / maxCount) * 100}%` }}
                transition={{ delay: 0.8 + i * 0.05, duration: 0.4 }}
                style={{ minHeight: w.count > 0 ? 4 : 0 }}
              />
              <span className="text-[8px] text-muted-foreground">{w.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2">
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">{appointments.length}</p>
          <p className="text-[9px] text-muted-foreground">Total RDV</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">
            {appointments.filter(a => a.status === "completed").length * 8500 > 0
              ? `${((appointments.filter(a => a.status === "completed").length * 8500) / 1000).toFixed(0)}k $`
              : "—"}
          </p>
          <p className="text-[9px] text-muted-foreground">Revenus estimés</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">
            {appointments.length > 0
              ? `${Math.round((appointments.filter(a => a.status === "completed" || a.status === "accepted").length / appointments.length) * 100)}%`
              : "—"}
          </p>
          <p className="text-[9px] text-muted-foreground">Conversion</p>
        </div>
      </div>
    </motion.div>
  );
}
