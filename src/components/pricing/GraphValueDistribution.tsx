import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import BadgeProjectSize from "./BadgeProjectSize";

const PROJECT_DATA = [
  { size: "XS", avgValue: 325, convRate: 0.75 },
  { size: "S", avgValue: 1000, convRate: 0.65 },
  { size: "M", avgValue: 3250, convRate: 0.50 },
  { size: "L", avgValue: 10000, convRate: 0.35 },
  { size: "XL", avgValue: 45000, convRate: 0.25 },
];

export default function GraphValueDistribution() {
  const [mixIndex, setMixIndex] = useState([2]); // 0=XS-heavy, 4=XL-heavy
  const [rdvCount, setRdvCount] = useState([8]);

  const result = useMemo(() => {
    const idx = mixIndex[0];
    const count = rdvCount[0];

    // Weighted average based on slider position
    const weights = PROJECT_DATA.map((_, i) => {
      const dist = Math.abs(i - idx);
      return Math.max(0, 3 - dist);
    });
    const totalW = weights.reduce((a, b) => a + b, 0);

    let avgValue = 0;
    let avgConv = 0;
    weights.forEach((w, i) => {
      avgValue += (w / totalW) * PROJECT_DATA[i].avgValue;
      avgConv += (w / totalW) * PROJECT_DATA[i].convRate;
    });

    const conversions = Math.round(count * avgConv);
    const revenue = Math.round(conversions * avgValue);
    const perRdv = count > 0 ? Math.round(revenue / count) : 0;

    return { avgValue: Math.round(avgValue), avgConv, conversions, revenue, perRdv, dominantSize: PROJECT_DATA[idx].size };
  }, [mixIndex, rdvCount]);

  const formatMoney = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k $` : `${n} $`;

  return (
    <div className="rounded-xl bg-card/50 border border-border/30 p-4 space-y-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Simulation dynamique</p>

      {/* Slider: project mix */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Type de projets dominant</span>
          <BadgeProjectSize size={result.dominantSize} active />
        </div>
        <Slider value={mixIndex} onValueChange={setMixIndex} min={0} max={4} step={1} className="w-full" />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>Petits (XS)</span>
          <span>Grands (XL)</span>
        </div>
      </div>

      {/* Slider: rdv count */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Rendez-vous / mois</span>
          <span className="text-sm font-bold text-foreground">{rdvCount[0]}</span>
        </div>
        <Slider value={rdvCount} onValueChange={setRdvCount} min={3} max={30} step={1} className="w-full" />
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/30">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Revenu estimé mensuel</p>
          <p className="text-xl font-extrabold text-success">{formatMoney(result.revenue)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Par rendez-vous</p>
          <p className="text-xl font-extrabold text-primary">{formatMoney(result.perRdv)}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        ~{result.conversions} conversions estimées · taux moyen {(result.avgConv * 100).toFixed(0)}%
      </p>
    </div>
  );
}
