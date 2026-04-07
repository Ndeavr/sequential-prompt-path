import { Calendar, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import type { GoalResults } from "@/hooks/useGoalToPlanEngine";

interface Props {
  results: GoalResults;
}

export default function SectionAppointmentsCalc({ results }: Props) {
  const capIcon = results.capacityStatus === "surcharge"
    ? <AlertCircle className="w-4 h-4 text-destructive" />
    : results.capacityStatus === "equilibre"
      ? <CheckCircle2 className="w-4 h-4 text-success" />
      : <CheckCircle2 className="w-4 h-4 text-accent" />;

  const capLabel = results.capacityStatus === "surcharge"
    ? "Capacité insuffisante — considérez ajuster vos objectifs"
    : results.capacityStatus === "equilibre"
      ? "Capacité en équilibre avec vos objectifs"
      : "Capacité suffisante pour vos objectifs";

  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <Calendar className="w-6 h-6 text-primary mx-auto mb-3" />
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Rendez-vous requis</h2>
        <p className="text-muted-foreground mb-8">Pour atteindre votre objectif, voici ce qu'il vous faut.</p>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 mb-6">
          <p className="text-5xl font-bold text-primary mb-2">{results.requiredAppointmentsMonthly}</p>
           <p className="text-muted-foreground">rendez-vous qualifiés par mois</p>
           <p className="text-sm text-muted-foreground mt-1">≈ {results.requiredAppointmentsWeekly} par semaine</p>
           {results.recommendedPlanIncludedRdv > 0 && (
             <p className="text-xs text-primary/80 mt-2">
               {results.recommendedPlanIncludedRdv} inclus dans votre plan
               {results.extraRdvNeeded > 0 && ` · +${results.extraRdvNeeded} en forfait`}
             </p>
           )}
        </div>

        <div className="flex items-center justify-center gap-2 text-sm mb-8">
          {capIcon}
          <span className="text-muted-foreground">{capLabel}</span>
        </div>

        {/* Mix breakdown */}
        <h3 className="text-lg font-semibold text-foreground mb-4">Mix recommandé</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
          {results.appointmentMix.map(m => (
            <div key={m.size} className="rounded-xl border border-border/50 bg-card/60 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Projets {m.label}</p>
              <p className="text-2xl font-bold text-foreground">{m.count}</p>
              <p className="text-[10px] text-muted-foreground">~{m.avgValue.toLocaleString("fr-CA")}$/proj</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
