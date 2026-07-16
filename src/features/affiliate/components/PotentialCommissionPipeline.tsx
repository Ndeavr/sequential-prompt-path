/**
 * UNPRO — Potential Commission Pipeline widget (Module 16 — Dashboard)
 * Displays aggregate potential earnings across an affiliate's assigned leads.
 */
import { aggregatePipeline, DEFAULT_COMMISSION_RATE, DEFAULT_LIFETIME_MONTHS } from "@/features/affiliate/revenueMath";
import { formatPrice } from "@/lib/formatPrice";
import { Rocket } from "lucide-react";
import type { ContractorPlanSlug } from "@/config/contractorPlans";

interface Props {
  /** Recommended plan slug for each assigned lead */
  recommendedPlans: ContractorPlanSlug[];
  commissionRate?: number;
  lifetimeMonths?: number;
}

export default function PotentialCommissionPipeline({
  recommendedPlans,
  commissionRate = DEFAULT_COMMISSION_RATE,
  lifetimeMonths = DEFAULT_LIFETIME_MONTHS,
}: Props) {
  const totals = aggregatePipeline(recommendedPlans, commissionRate, lifetimeMonths);

  return (
    <section className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-background p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Rocket className="h-4 w-4 text-emerald-500" />
        <h3 className="text-sm font-semibold uppercase tracking-widest text-emerald-500">
          Pipeline de commission
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        <span className="font-semibold text-foreground">{totals.count}</span>{" "}
        entrepreneurs assignés — potentiel si tous activés au plan recommandé.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <PipelineStat label="Mensuel" value={totals.potentialMonthly} />
        <PipelineStat label="Annuel" value={totals.potentialAnnual} />
        <PipelineStat label="Valeur à vie" value={totals.potentialLifetime} highlight />
      </div>
    </section>
  );
}

function PipelineStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/30 bg-card/50 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={
          highlight
            ? "text-2xl font-bold text-emerald-500 tabular-nums mt-1"
            : "text-xl font-semibold text-foreground tabular-nums mt-1"
        }
      >
        {formatPrice(value)}
      </div>
    </div>
  );
}
