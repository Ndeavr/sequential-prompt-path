import { motion } from "framer-motion";
import { DollarSign, Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RevenueInputs {
  targetRevenue: number;
  avgJobValue: number;
  marginPercent: number;
  closeRate: number;
}

interface Props {
  inputs: RevenueInputs;
  onChange: (inputs: RevenueInputs) => void;
}

export default function RevenueGoalInputCard({ inputs, onChange }: Props) {
  const update = (key: keyof RevenueInputs, val: string) => {
    onChange({ ...inputs, [key]: parseFloat(val) || 0 });
  };

  const requiredJobs = inputs.avgJobValue > 0
    ? Math.ceil(inputs.targetRevenue / inputs.avgJobValue)
    : 0;

  const closeRate = inputs.closeRate > 0 ? inputs.closeRate / 100 : 0.3;
  const requiredAppointments = closeRate > 0 ? Math.ceil(requiredJobs / closeRate) : 0;
  const monthlyAppointments = Math.ceil(requiredAppointments / 12);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card p-5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">Calculateur de revenus</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Objectif annuel ($)</Label>
          <Input
            type="number"
            placeholder="250000"
            value={inputs.targetRevenue || ""}
            onChange={e => update("targetRevenue", e.target.value)}
            className="h-10 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Valeur moy. contrat ($)</Label>
          <Input
            type="number"
            placeholder="8000"
            value={inputs.avgJobValue || ""}
            onChange={e => update("avgJobValue", e.target.value)}
            className="h-10 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Marge brute (%)</Label>
          <Input
            type="number"
            placeholder="25"
            value={inputs.marginPercent || ""}
            onChange={e => update("marginPercent", e.target.value)}
            className="h-10 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Taux closing (%)</Label>
          <Input
            type="number"
            placeholder="30"
            value={inputs.closeRate || ""}
            onChange={e => update("closeRate", e.target.value)}
            className="h-10 rounded-xl"
          />
        </div>
      </div>

      {/* Results */}
      {inputs.targetRevenue > 0 && inputs.avgJobValue > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl bg-gradient-to-br from-primary/10 to-secondary/5 p-4 space-y-3"
        >
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Pour atteindre votre objectif</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-black text-gradient">{requiredJobs}</p>
              <p className="text-[10px] text-muted-foreground">contrats/an</p>
            </div>
            <div>
              <p className="text-2xl font-black text-gradient">{requiredAppointments}</p>
              <p className="text-[10px] text-muted-foreground">RDV/an</p>
            </div>
            <div>
              <p className="text-2xl font-black text-primary">{monthlyAppointments}</p>
              <p className="text-[10px] text-muted-foreground">RDV/mois</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
