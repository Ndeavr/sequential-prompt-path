/**
 * UNPRO — Emergency Pricing Base Table (Admin)
 */
import { motion } from "framer-motion";
import { DollarSign } from "lucide-react";
import { useEmergencyPricingBase } from "@/hooks/useDynamicPricing";
import { formatCents } from "@/services/appointmentPricingEngine";

export default function EmergencyPricingBasePanel() {
  const { data: bases, isLoading } = useEmergencyPricingBase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">Prix de base urgence</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">{bases?.length ?? 0} catégories</span>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Chargement…</p>
      ) : !bases?.length ? (
        <p className="text-xs text-muted-foreground">Aucun prix de base configuré</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Catégorie</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Ville</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Base</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Plancher</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Plafond</th>
                <th className="text-right py-2 pl-3 text-muted-foreground font-medium">Acceptance %</th>
              </tr>
            </thead>
            <tbody>
              {bases.map((b: any) => (
                <tr key={b.id} className="border-b border-border/10">
                  <td className="py-2.5 pr-3 font-medium text-foreground">{b.category}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{b.city_slug || "—"}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-foreground font-semibold">
                    {formatCents(b.base_price_cents)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                    {b.floor_price_cents ? formatCents(b.floor_price_cents) : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                    {b.ceiling_price_cents ? formatCents(b.ceiling_price_cents) : "—"}
                  </td>
                  <td className="py-2.5 pl-3 text-right tabular-nums text-muted-foreground">
                    {b.historical_acceptance_rate != null ? `${Math.round(b.historical_acceptance_rate * 100)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
