/**
 * SliderRevenueObjectives — Interactive revenue objective slider with real-time projections.
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Users, Target } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface Props {
  avgTicket?: number;
  closingRate?: number;
  onObjectivesChange?: (objectives: {
    monthlyTarget: number;
    appointmentsNeeded: number;
    avgTicket: number;
    closingRate: number;
  }) => void;
  className?: string;
}

export default function SliderRevenueObjectives({
  avgTicket: initialTicket = 3500,
  closingRate: initialClosing = 30,
  onObjectivesChange,
  className,
}: Props) {
  const [monthlyTarget, setMonthlyTarget] = useState(15000);
  const [avgTicket, setAvgTicket] = useState(initialTicket);
  const [closingRate, setClosingRate] = useState(initialClosing);

  const appointmentsNeeded = Math.ceil(monthlyTarget / avgTicket / (closingRate / 100));
  const leadsNeeded = Math.ceil(appointmentsNeeded / 0.7); // ~70% show rate

  const handleChange = useCallback(
    (field: string, value: number) => {
      let mt = monthlyTarget, at = avgTicket, cr = closingRate;
      if (field === "target") { mt = value; setMonthlyTarget(value); }
      if (field === "ticket") { at = value; setAvgTicket(value); }
      if (field === "closing") { cr = value; setClosingRate(value); }
      onObjectivesChange?.({
        monthlyTarget: mt,
        appointmentsNeeded: Math.ceil(mt / at / (cr / 100)),
        avgTicket: at,
        closingRate: cr,
      });
    },
    [monthlyTarget, avgTicket, closingRate, onObjectivesChange]
  );

  const formatK = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `${v}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-card rounded-2xl p-5 space-y-5", className)}
    >
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" />
        Vos objectifs de revenus
      </h3>

      {/* Monthly target */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Revenu mensuel cible</span>
          <span className="font-bold text-primary">{formatK(monthlyTarget)} $</span>
        </div>
        <Slider
          value={[monthlyTarget]}
          onValueChange={([v]) => handleChange("target", v)}
          min={5000}
          max={100000}
          step={2500}
          className="py-1"
        />
      </div>

      {/* Avg ticket */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Panier moyen</span>
          <span className="font-semibold text-foreground">{formatK(avgTicket)} $</span>
        </div>
        <Slider
          value={[avgTicket]}
          onValueChange={([v]) => handleChange("ticket", v)}
          min={500}
          max={25000}
          step={250}
          className="py-1"
        />
      </div>

      {/* Closing rate */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Taux de fermeture</span>
          <span className="font-semibold text-foreground">{closingRate}%</span>
        </div>
        <Slider
          value={[closingRate]}
          onValueChange={([v]) => handleChange("closing", v)}
          min={10}
          max={80}
          step={5}
          className="py-1"
        />
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="rounded-xl bg-primary/10 p-3 text-center">
          <Users className="w-4 h-4 text-primary mx-auto mb-1" />
          <div className="text-lg font-bold text-foreground">{appointmentsNeeded}</div>
          <div className="text-[10px] text-muted-foreground">RDV / mois</div>
        </div>
        <div className="rounded-xl bg-accent/10 p-3 text-center">
          <TrendingUp className="w-4 h-4 text-accent mx-auto mb-1" />
          <div className="text-lg font-bold text-foreground">{formatK(monthlyTarget * 12)} $</div>
          <div className="text-[10px] text-muted-foreground">Revenus / an</div>
        </div>
      </div>
    </motion.div>
  );
}
