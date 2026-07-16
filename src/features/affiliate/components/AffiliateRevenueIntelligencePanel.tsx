/**
 * UNPRO — Affiliate Revenue Intelligence Panel (Module 16)
 * Sticky right-side on desktop, top on mobile. Shows every affiliate
 * exactly what a given contractor is worth to them if they close today.
 */
import { useMemo, useState } from "react";
import {
  breakdownAllPlans,
  breakdownForPlan,
  recommendPlan,
  DEFAULT_COMMISSION_RATE,
  DEFAULT_LIFETIME_MONTHS,
  type RecommenderInputs,
} from "@/features/affiliate/revenueMath";
import { getContractorPlan } from "@/config/contractorPlans";
import { formatPrice } from "@/lib/formatPrice";
import { Sparkles, TrendingUp, Target, DollarSign, MessageSquareQuote, Loader2 } from "lucide-react";

export interface AffiliateRevenueIntelligencePanelProps {
  /** Company name for the motivation widget */
  companyName: string;
  /** Signals feeding the deterministic plan recommender */
  signals: RecommenderInputs & {
    /** Optional pre-computed override (e.g. from backend) */
    recommendedPlanSlug?: "recrue" | "pro" | "premium" | "elite" | "signature" | null;
  };
  /** Affiliate commission rate (0.20 = 20%) */
  commissionRate?: number;
  /** Average contractor retention in months */
  lifetimeMonths?: number;
  /** Optional: fetch talking points from AI (Module 16 objection helper) */
  onGenerateTalkingPoints?: () => Promise<string[]>;
}

export default function AffiliateRevenueIntelligencePanel({
  companyName,
  signals,
  commissionRate = DEFAULT_COMMISSION_RATE,
  lifetimeMonths = DEFAULT_LIFETIME_MONTHS,
  onGenerateTalkingPoints,
}: AffiliateRevenueIntelligencePanelProps) {
  const recommendation = useMemo(() => {
    if (signals.recommendedPlanSlug) {
      return { slug: signals.recommendedPlanSlug, reasons: [] as string[] };
    }
    return recommendPlan(signals);
  }, [signals]);

  const recPlan = getContractorPlan(recommendation.slug);
  const recBreakdown = breakdownForPlan(recommendation.slug, commissionRate, lifetimeMonths);
  const allPlans = breakdownAllPlans(commissionRate, lifetimeMonths);

  const [tpOpen, setTpOpen] = useState(false);
  const [tpLoading, setTpLoading] = useState(false);
  const [talkingPoints, setTalkingPoints] = useState<string[] | null>(null);

  async function handleTalkingPoints() {
    setTpOpen(true);
    if (talkingPoints || !onGenerateTalkingPoints) return;
    setTpLoading(true);
    try {
      const pts = await onGenerateTalkingPoints();
      setTalkingPoints(pts);
    } catch {
      setTalkingPoints([
        "Positionnement adapté à votre volume actuel d'avis.",
        "Gains de visibilité IA immédiats sur votre territoire.",
        "Rendez-vous préqualifiés directement à l'agenda.",
      ]);
    } finally {
      setTpLoading(false);
    }
  }

  return (
    <aside
      className="lg:sticky lg:top-24 space-y-4"
      aria-label="Panneau intelligence revenu affilié"
    >
      {/* Recommended Plan */}
      <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-[11px] uppercase tracking-widest text-primary font-semibold">
            Plan recommandé
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-2xl font-bold text-foreground">{recPlan?.name}</h3>
          <span className="text-lg font-semibold text-foreground">
            {formatPrice(recBreakdown.monthlyPrice)}<span className="text-xs text-muted-foreground">/mois</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {recPlan?.subtitle ?? "Ajusté à ce profil"}
        </p>
        {recPlan?.appointmentsIncluded ? (
          <p className="text-xs text-muted-foreground mt-2">
            Rendez-vous estimés :{" "}
            <span className="font-semibold text-foreground">
              {recPlan.appointmentsIncluded}/mois
            </span>
          </p>
        ) : null}
      </section>

      {/* Why this plan */}
      <section className="rounded-xl border border-border/40 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Pourquoi ce plan</h4>
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <SignalRow label="Score visibilité" value={signals.unproScore ?? "—"} />
          <SignalRow label="Avis" value={signals.reviewCount ?? "—"} />
          <SignalRow label="Demande" value={demandLabel(signals.demandLevel)} />
          <SignalRow label="Territoire" value={territoryLabel(signals.territorySize)} />
        </dl>
        {recommendation.reasons.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-border/40 pt-3">
            {recommendation.reasons.map((r) => (
              <li key={r} className="text-xs text-muted-foreground flex gap-2">
                <span className="text-primary">•</span>
                {r}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Commission matrix */}
      <section className="rounded-xl border border-border/40 bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">
              Commission par plan
            </h4>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Taux {Math.round(commissionRate * 100)}%
          </span>
        </div>
        <div className="overflow-hidden rounded-lg border border-border/30">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="text-left px-2.5 py-1.5 font-medium">Plan</th>
                <th className="text-right px-2.5 py-1.5 font-medium">Mois</th>
                <th className="text-right px-2.5 py-1.5 font-medium">An</th>
                <th className="text-right px-2.5 py-1.5 font-medium">Vie</th>
              </tr>
            </thead>
            <tbody>
              {allPlans.map((row) => {
                const isRec = row.slug === recommendation.slug;
                return (
                  <tr
                    key={row.slug}
                    className={
                      isRec
                        ? "bg-primary/5 border-t border-primary/20 font-semibold text-foreground"
                        : "border-t border-border/20 text-muted-foreground"
                    }
                  >
                    <td className="px-2.5 py-1.5">
                      {row.name}
                      {isRec && (
                        <span className="ml-1 text-[9px] uppercase text-primary">•</span>
                      )}
                    </td>
                    <td className="text-right px-2.5 py-1.5 tabular-nums">
                      {formatPrice(row.monthlyCommission)}
                    </td>
                    <td className="text-right px-2.5 py-1.5 tabular-nums">
                      {formatPrice(row.annualCommission)}
                    </td>
                    <td className="text-right px-2.5 py-1.5 tabular-nums">
                      {formatPrice(row.lifetimeCommission)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Valeur à vie estimée sur {lifetimeMonths} mois moyens de rétention.
        </p>
      </section>

      {/* Motivation Widget */}
      <section className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-background p-5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <span className="text-[11px] uppercase tracking-widest text-emerald-500 font-semibold">
            Fermer aujourd'hui
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground mb-3 line-clamp-2">
          {companyName}
        </p>
        <div className="space-y-1.5">
          <MotivRow label="Mensuel" value={recBreakdown.monthlyCommission} />
          <MotivRow label="Annuel" value={recBreakdown.annualCommission} />
          <MotivRow label="Valeur à vie" value={recBreakdown.lifetimeCommission} big />
        </div>
      </section>

      {/* Talking points */}
      <section className="rounded-xl border border-border/40 bg-card p-4">
        <button
          type="button"
          onClick={handleTalkingPoints}
          className="w-full flex items-center justify-between text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          <span className="flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4" />
            Points de discussion
          </span>
          <span className="text-xs text-muted-foreground">
            {tpOpen ? "Masquer" : "Afficher"}
          </span>
        </button>
        {tpOpen && (
          <div className="mt-3 border-t border-border/40 pt-3">
            {tpLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Génération…
              </div>
            ) : (
              <ul className="space-y-2">
                {(talkingPoints ?? defaultTalkingPoints(recommendation.slug)).map((pt, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-primary shrink-0">→</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </aside>
  );
}

function SignalRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground tabular-nums">{value}</dd>
    </>
  );
}

function MotivRow({ label, value, big }: { label: string; value: number; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={
          big
            ? "text-2xl font-bold text-emerald-500 tabular-nums"
            : "text-sm font-semibold text-foreground tabular-nums"
        }
      >
        {formatPrice(value)}
      </span>
    </div>
  );
}

function demandLabel(d?: "low" | "medium" | "high" | null): string {
  if (d === "high") return "Élevée";
  if (d === "medium") return "Moyenne";
  if (d === "low") return "Faible";
  return "—";
}
function territoryLabel(t?: "small" | "medium" | "large" | null): string {
  if (t === "large") return "Large";
  if (t === "medium") return "Moyen";
  if (t === "small") return "Ciblé";
  return "—";
}

function defaultTalkingPoints(slug: string): string[] {
  const base = [
    "Positionnement aligné sur votre volume actuel d'activité.",
    "Visibilité IA renforcée auprès des propriétaires du secteur.",
    "Rendez-vous préqualifiés directement à votre agenda.",
    "Aucun engagement long — activation 7 jours à 1 $.",
  ];
  if (slug === "premium" || slug === "elite" || slug === "signature") {
    base.push("Territoire à fort potentiel — protection de la place recommandée.");
  }
  return base;
}
