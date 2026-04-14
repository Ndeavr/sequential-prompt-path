/**
 * UNPRO — Affiliate Performance Card
 */
import { TrendingUp, Users, DollarSign, MousePointerClick } from "lucide-react";

interface Props {
  totalClicks: number;
  totalConversions: number;
  totalRevenueCents: number;
  conversionRate: number;
}

const CardAffiliatePerformance = ({ totalClicks, totalConversions, totalRevenueCents, conversionRate }: Props) => {
  const stats = [
    { label: "Clics", value: totalClicks, icon: MousePointerClick, color: "text-blue-500" },
    { label: "Conversions", value: totalConversions, icon: Users, color: "text-emerald-500" },
    { label: "Revenus", value: `${(totalRevenueCents / 100).toFixed(2)}$`, icon: DollarSign, color: "text-amber-500" },
    { label: "Taux conv.", value: `${conversionRate}%`, icon: TrendingUp, color: "text-purple-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-border/30 bg-card p-4 text-center">
          <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
          <div className="text-xl font-bold text-foreground">{s.value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
};

export default CardAffiliatePerformance;
