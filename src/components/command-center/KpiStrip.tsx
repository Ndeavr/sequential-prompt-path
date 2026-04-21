/**
 * UNPRO — Command Center KPI Strip
 */
import { motion } from "framer-motion";
import { Users, Send, Flame, TrendingUp, ShoppingCart, CheckCircle2, DollarSign, Target } from "lucide-react";
import type { CommandCenterKpis } from "@/services/dynamicPricingEngine";

const KPI_CONFIG = [
  { key: "targetsImported" as const, label: "Cibles", icon: Users },
  { key: "sent" as const, label: "Envoyés", icon: Send },
  { key: "engaged" as const, label: "Engagés", icon: Flame },
  { key: "auditsStarted" as const, label: "Audits", icon: TrendingUp },
  { key: "checkoutStarts" as const, label: "Checkouts", icon: ShoppingCart },
  { key: "converted" as const, label: "Convertis", icon: CheckCircle2 },
  { key: "revenue" as const, label: "Revenus", icon: DollarSign, format: "currency" },
  { key: "revenuePer100Targets" as const, label: "Rev/100", icon: Target, format: "currency" },
];

export default function KpiStrip({ kpis }: { kpis: CommandCenterKpis }) {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
      {KPI_CONFIG.map((k, i) => {
        const value = kpis[k.key];
        const display = k.format === "currency" ? `${value.toLocaleString("fr-CA")} $` : value.toLocaleString("fr-CA");
        return (
          <motion.div
            key={k.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex-shrink-0 min-w-[120px] rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-3 text-center"
          >
            <k.icon className="w-4 h-4 mx-auto mb-1 text-primary/70" />
            <div className="text-lg font-bold text-foreground">{display}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</div>
          </motion.div>
        );
      })}
    </div>
  );
}
