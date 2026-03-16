import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Calculator, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const AVG_REVENUE_PER_APPOINTMENT = 1200; // average project revenue

function getRecommendedPlan(count: number) {
  if (count <= 5) return { name: "Recrue", cost: 0 };
  if (count <= 15) return { name: "Pro", cost: 49 };
  if (count <= 30) return { name: "Premium", cost: 99 };
  if (count <= 40) return { name: "Élite", cost: 199 };
  return { name: "Signature", cost: 399 };
}

export default function AppointmentCalculator() {
  const [count, setCount] = useState([10]);
  const plan = useMemo(() => getRecommendedPlan(count[0]), [count]);
  const avgAppointmentCost = 85; // weighted average
  const monthlyCost = plan.cost + count[0] * avgAppointmentCost;
  const potentialRevenue = count[0] * AVG_REVENUE_PER_APPOINTMENT;

  return (
    <section className="px-5 py-16">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <div className="glass-card-elevated rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-accent/10 text-accent text-sm font-semibold mb-3">
                <Calculator className="h-3.5 w-3.5" /> Calculateur
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Combien de rendez-vous voulez-vous recevoir?</h2>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Rendez-vous / mois</span>
                <span className="text-2xl font-extrabold text-primary">{count[0]}</span>
              </div>
              <Slider
                value={count}
                onValueChange={setCount}
                min={5}
                max={50}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>5</span>
                <span>50</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Plan recommandé</p>
                <p className="text-lg font-bold text-foreground">{plan.name}</p>
                <p className="text-xs text-muted-foreground">{plan.cost} $/mois</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Coût estimé</p>
                <p className="text-lg font-bold text-foreground">{monthlyCost.toLocaleString()} $</p>
                <p className="text-xs text-muted-foreground">/mois</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Revenu potentiel</p>
                <p className="text-lg font-bold text-success">{potentialRevenue.toLocaleString()} $</p>
                <div className="flex items-center justify-center gap-1 text-xs text-success">
                  <TrendingUp className="h-3 w-3" />
                  {Math.round(potentialRevenue / monthlyCost)}x ROI
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
