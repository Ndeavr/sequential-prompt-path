import { useState, forwardRef } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Calculator } from "lucide-react";

const IncomeSimulatorWidget = forwardRef<HTMLDivElement>((_, ref) => {
  const [meetings, setMeetings] = useState(5);
  const [conversionRate, setConversionRate] = useState(50);
  const [avgCommission, setAvgCommission] = useState(250);

  const monthlyClients = Math.round(meetings * 4 * (conversionRate / 100));
  const monthlyRevenue = monthlyClients * avgCommission;
  const annualRevenue = monthlyRevenue * 12;
  // Recurring: assume each client stays 12 months avg, so after 6 months portfolio grows
  const recurringMonthly = Math.round(monthlyClients * 6 * (avgCommission * 0.15));

  return (
    <section ref={ref} className="py-20 px-4 bg-background">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Calculator className="h-4 w-4" />
            Simulateur de revenus
          </div>
          <h2 className="text-3xl font-display font-bold text-foreground">
            Combien tu peux gagner?
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border/60 bg-card p-6 space-y-8"
        >
          {/* Sliders */}
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Rencontres / semaine</label>
                <span className="text-sm font-bold text-primary">{meetings}</span>
              </div>
              <Slider value={[meetings]} onValueChange={([v]) => setMeetings(v)} min={1} max={15} step={1} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Taux de conversion</label>
                <span className="text-sm font-bold text-primary">{conversionRate}%</span>
              </div>
              <Slider value={[conversionRate]} onValueChange={([v]) => setConversionRate(v)} min={20} max={80} step={5} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Commission moyenne</label>
                <span className="text-sm font-bold text-primary">{avgCommission}$</span>
              </div>
              <Slider value={[avgCommission]} onValueChange={([v]) => setAvgCommission(v)} min={100} max={500} step={25} />
            </div>
          </div>

          {/* Results */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/40">
            <div className="text-center p-4 rounded-xl bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Revenu mensuel</p>
              <p className="text-2xl font-display font-bold text-foreground">{monthlyRevenue.toLocaleString('fr-CA')}$</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Revenu annuel</p>
              <p className="text-2xl font-display font-bold text-foreground">{annualRevenue.toLocaleString('fr-CA')}$</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-primary/10">
              <p className="text-sm text-primary mb-1">Récurrent projeté</p>
              <p className="text-2xl font-display font-bold text-primary">{recurringMonthly.toLocaleString('fr-CA')}$/mo</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

IncomeSimulatorWidget.displayName = "IncomeSimulatorWidget";
export default IncomeSimulatorWidget;
