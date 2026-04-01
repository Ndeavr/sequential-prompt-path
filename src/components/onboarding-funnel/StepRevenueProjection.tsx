/**
 * StepRevenueProjection — Revenue reality check with lost revenue estimate.
 */
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { DollarSign, TrendingUp, AlertCircle, ArrowRight } from "lucide-react";

interface RevenueInputs {
  submissions_per_month: number;
  close_rate_percent: number;
  avg_contract_value: number;
  profit_margin_percent: number;
}

interface Props {
  onContinue: (inputs: RevenueInputs) => void;
}

const SLIDER_FIELDS = [
  { key: "submissions_per_month", label: "Soumissions par mois", min: 1, max: 50, step: 1, default: 10, suffix: "" },
  { key: "close_rate_percent", label: "Taux de gain (%)", min: 5, max: 80, step: 5, default: 25, suffix: "%" },
  { key: "avg_contract_value", label: "Valeur moyenne d'un contrat ($)", min: 500, max: 50000, step: 500, default: 5000, suffix: "$" },
  { key: "profit_margin_percent", label: "Marge de profit (%)", min: 5, max: 60, step: 5, default: 20, suffix: "%" },
] as const;

export default function StepRevenueProjection({ onContinue }: Props) {
  const [inputs, setInputs] = useState<RevenueInputs>({
    submissions_per_month: 10,
    close_rate_percent: 25,
    avg_contract_value: 5000,
    profit_margin_percent: 20,
  });

  const stats = useMemo(() => {
    const won = Math.round(inputs.submissions_per_month * (inputs.close_rate_percent / 100));
    const revenue = won * inputs.avg_contract_value;
    const profit = revenue * (inputs.profit_margin_percent / 100);
    const lostSubmissions = inputs.submissions_per_month - won;
    const costPerSubmission = 250; // avg cost to prepare a submission
    const wastedCost = lostSubmissions * costPerSubmission;
    const potentialWithBetterRate = Math.round(inputs.submissions_per_month * 0.45) * inputs.avg_contract_value;
    const lostRevenue = potentialWithBetterRate - revenue;
    const lostProfit = lostRevenue * (inputs.profit_margin_percent / 100);

    return { won, revenue, profit, lostSubmissions, wastedCost, lostRevenue: Math.max(0, lostRevenue), lostProfit: Math.max(0, lostProfit) };
  }, [inputs]);

  const fmt = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Votre réalité business</h2>
        <p className="text-sm text-muted-foreground">Ajustez les curseurs selon votre situation actuelle</p>
      </div>

      {/* Sliders */}
      <div className="space-y-5">
        {SLIDER_FIELDS.map(({ key, label, min, max, step, suffix }) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs text-muted-foreground">{label}</label>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {key === "avg_contract_value" ? fmt(inputs[key]) : `${inputs[key]}${suffix}`}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={inputs[key]}
              onChange={(e) => setInputs((p) => ({ ...p, [key]: Number(e.target.value) }))}
              className="w-full accent-primary h-2"
            />
          </div>
        ))}
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-card border border-border/40 p-4 text-center">
          <p className="text-xs text-muted-foreground">Contrats gagnés/mois</p>
          <p className="text-2xl font-bold text-foreground">{stats.won}</p>
        </div>
        <div className="rounded-xl bg-card border border-border/40 p-4 text-center">
          <p className="text-xs text-muted-foreground">Revenu mensuel</p>
          <p className="text-2xl font-bold text-foreground">{fmt(stats.revenue)}</p>
        </div>
        <div className="rounded-xl bg-card border border-border/40 p-4 text-center">
          <p className="text-xs text-muted-foreground">Profit mensuel</p>
          <p className="text-2xl font-bold text-green-400">{fmt(stats.profit)}</p>
        </div>
        <div className="rounded-xl bg-card border border-border/40 p-4 text-center">
          <p className="text-xs text-muted-foreground">Soumissions gaspillées</p>
          <p className="text-2xl font-bold text-destructive">{stats.lostSubmissions}</p>
        </div>
      </div>

      {/* Lost revenue card */}
      {stats.lostRevenue > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-destructive/10 to-card border border-destructive/20 p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm font-bold text-foreground">Ce que vous laissez sur la table</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Revenu perdu / mois</p>
              <p className="text-xl font-black text-destructive">{fmt(stats.lostRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Profit perdu / mois</p>
              <p className="text-xl font-black text-destructive">{fmt(stats.lostProfit)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Avec un meilleur matching, moins de soumissions gaspillées = plus de contrats signés.
          </p>
        </motion.div>
      )}

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onContinue(inputs)}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg flex items-center justify-center gap-2"
      >
        Définir mes objectifs
        <ArrowRight className="w-5 h-5" />
      </motion.button>
    </div>
  );
}
