import { TrendingDown, AlertTriangle } from "lucide-react";
import type { GoalResults } from "@/hooks/useGoalToPlanEngine";

interface Props {
  results: GoalResults;
}

export default function SectionLostRevenue({ results }: Props) {
  const fmt = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 text-warning mb-4">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">Ce que vous laissez sur la table</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Le problème n'est pas votre travail.
        </h2>
        <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
          Le problème, c'est ce que vous perdez entre visibilité, compatibilité et conversion.
        </p>

        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 backdrop-blur-sm p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Revenu actuel</p>
              <p className="text-lg font-bold text-foreground">{fmt(results.currentMonthlyRevenue)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Potentiel estimé</p>
              <p className="text-lg font-bold text-success">{fmt(results.projectedRevenueMin)} — {fmt(results.projectedRevenueMax)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Perte revenu / mois</p>
              <p className="text-lg font-bold text-destructive">{fmt(results.lostRevenueMin)} — {fmt(results.lostRevenueMax)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Perte profit / mois</p>
              <p className="text-lg font-bold text-warning">{fmt(results.lostProfitMin)} — {fmt(results.lostProfitMax)}</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-destructive/10">
            <p className="text-foreground font-semibold text-lg flex items-center justify-center gap-2">
              <TrendingDown className="w-5 h-5 text-destructive" />
              Vous laissez environ {fmt(results.lostRevenueMin)} à {fmt(results.lostRevenueMax)}/mois sur la table.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
