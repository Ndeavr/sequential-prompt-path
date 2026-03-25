/**
 * UNPRO — Zone Profitability Table
 */
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, TrendingUp } from "lucide-react";
import { formatCentsCAD } from "@/lib/zoneValueScoring";

interface ZoneRow {
  id: string;
  city_slug: string;
  trade_slug: string;
  zone_value_score: number;
  demand_volume: number;
  avg_predicted_profit_cents: number;
  exclusivity_eligible: boolean;
  suggested_premium_cents: number | null;
  revenue_projection_monthly_cents: number | null;
}

interface Props {
  zones: ZoneRow[];
  isLoading: boolean;
}

export default function TableZoneProfitability({ zones, isLoading }: Props) {
  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  if (!zones.length) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/40 p-8 text-center">
        <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Aucune zone scorée pour le moment</p>
      </div>
    );
  }

  const sorted = [...zones].sort((a, b) => b.zone_value_score - a.zone_value_score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/30 bg-card/60 overflow-hidden"
    >
      <div className="p-4 border-b border-border/20">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          Profitabilité par zone
        </h3>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden divide-y divide-border/10">
        {sorted.map((z) => (
          <div key={z.id} className="p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground capitalize">{z.city_slug} · {z.trade_slug}</span>
              <div className="flex items-center gap-1">
                {z.exclusivity_eligible && <Crown className="h-3 w-3 text-violet-400" />}
                <span className={`text-sm font-bold ${z.zone_value_score >= 65 ? "text-emerald-400" : "text-foreground"}`}>{z.zone_value_score}</span>
              </div>
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span>Demande: {z.demand_volume}</span>
              <span>Profit moy: {formatCentsCAD(z.avg_predicted_profit_cents)}</span>
              {z.suggested_premium_cents && <span>Premium: {formatCentsCAD(z.suggested_premium_cents)}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/20 text-muted-foreground">
              <th className="text-left p-3 font-medium">Zone</th>
              <th className="text-right p-3 font-medium">Score</th>
              <th className="text-right p-3 font-medium">Demande</th>
              <th className="text-right p-3 font-medium">Profit moy.</th>
              <th className="text-right p-3 font-medium">Premium suggéré</th>
              <th className="text-right p-3 font-medium">Revenu projeté/mois</th>
              <th className="text-center p-3 font-medium">Exclusivité</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/10">
            {sorted.map((z) => (
              <tr key={z.id} className="hover:bg-muted/20 transition-colors">
                <td className="p-3 capitalize font-medium text-foreground">{z.city_slug} · {z.trade_slug}</td>
                <td className={`p-3 text-right font-bold ${z.zone_value_score >= 65 ? "text-emerald-400" : "text-foreground"}`}>{z.zone_value_score}</td>
                <td className="p-3 text-right text-muted-foreground">{z.demand_volume}</td>
                <td className="p-3 text-right text-foreground">{formatCentsCAD(z.avg_predicted_profit_cents)}</td>
                <td className="p-3 text-right text-primary">{z.suggested_premium_cents ? formatCentsCAD(z.suggested_premium_cents) : "—"}</td>
                <td className="p-3 text-right text-foreground">{z.revenue_projection_monthly_cents ? formatCentsCAD(z.revenue_projection_monthly_cents) : "—"}</td>
                <td className="p-3 text-center">
                  {z.exclusivity_eligible ? <Crown className="h-4 w-4 text-violet-400 mx-auto" /> : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
