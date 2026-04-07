import { Rocket, MessageCircle, MapPin, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GoalResults } from "@/hooks/useGoalToPlanEngine";

const PLAN_LABELS: Record<string, string> = {
  recrue: "Recrue", pro: "Pro", premium: "Premium", elite: "Élite", signature: "Signature",
};

interface Props {
  results: GoalResults | null;
  onActivate: () => void;
  onAlex: () => void;
  onCheckCity: () => void;
}

export default function SectionFinalCTAGoal({ results, onActivate, onAlex, onCheckCity }: Props) {
  const fmt = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

  return (
    <section className="py-20 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 font-display">
          Vous faites déjà la job.
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Laissez UNPRO vous amener les bons clients.
        </p>

        {results && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10 max-w-lg mx-auto">
            <div className="rounded-xl border border-border/50 bg-card/60 p-3 text-center">
              <p className="text-xs text-muted-foreground">Perte actuelle</p>
              <p className="text-sm font-bold text-destructive">~{fmt(results.lostRevenueMin)}/mo</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/60 p-3 text-center">
              <p className="text-xs text-muted-foreground">RDV requis</p>
              <p className="text-sm font-bold text-primary">{results.requiredAppointmentsMonthly}/mo</p>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center col-span-2 sm:col-span-1">
              <p className="text-xs text-muted-foreground">Plan recommandé</p>
              <p className="text-sm font-bold text-primary">{PLAN_LABELS[results.recommendedPlan]}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" onClick={onActivate} className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <Rocket className="w-4 h-4" /> Activer mon plan
          </Button>
          <Button variant="outline" size="lg" onClick={onAlex} className="w-full sm:w-auto gap-2">
            <MessageCircle className="w-4 h-4" /> Parler à Alex
          </Button>
          <Button variant="ghost" size="lg" onClick={onCheckCity} className="w-full sm:w-auto gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" /> Vérifier ma ville
          </Button>
        </div>
      </div>
    </section>
  );
}
