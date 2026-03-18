/**
 * KPI Row — 6 animated stat cards
 */
import { motion } from "framer-motion";
import { CalendarCheck, CheckCircle2, DollarSign, TrendingUp, Star, MapPin } from "lucide-react";

const f = (i: number) => ({
  initial: { opacity: 0, y: 10, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { delay: 0.15 + i * 0.06, duration: 0.4 } },
});

interface Props {
  newAppts: number;
  acceptedAppts: number;
  completedAppts: number;
  aipp: number;
  avgRating: number;
  reviewCount: number;
}

export default function DashKpiRow({ newAppts, acceptedAppts, completedAppts, aipp, avgRating, reviewCount }: Props) {
  const estimatedRevenue = completedAppts * 8500; // placeholder avg
  const conversionRate = newAppts > 0 ? Math.round((acceptedAppts / Math.max(newAppts + acceptedAppts + completedAppts, 1)) * 100) : 0;

  const kpis = [
    { icon: CalendarCheck, label: "Rendez-vous reçus", value: String(newAppts + acceptedAppts + completedAppts), color: "text-primary" },
    { icon: CheckCircle2, label: "Rendez-vous acceptés", value: String(acceptedAppts + completedAppts), color: "text-success" },
    { icon: DollarSign, label: "Revenus estimés", value: estimatedRevenue > 0 ? `${(estimatedRevenue / 1000).toFixed(0)}k $` : "—", color: "text-accent" },
    { icon: TrendingUp, label: "Taux de conversion", value: `${conversionRate}%`, color: "text-secondary" },
    { icon: Star, label: "Score AIPP", value: String(aipp), color: "text-primary" },
    { icon: MapPin, label: "Villes actives", value: "—", color: "text-accent" },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      {kpis.map((k, i) => (
        <motion.div
          key={k.label} {...f(i)}
          className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-3 text-center hover:border-primary/20 hover:bg-card/50 transition-all cursor-default group"
        >
          <k.icon className={`w-4 h-4 mx-auto ${k.color} mb-1.5 group-hover:scale-110 transition-transform`} />
          <p className="text-base font-bold text-foreground">{k.value}</p>
          <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{k.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
