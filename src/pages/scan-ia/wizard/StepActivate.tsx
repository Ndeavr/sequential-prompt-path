import { useMemo, useState } from "react";
import WizardShell from "./WizardShell";
import { useScanWizardState } from "./useScanWizardState";
import { pickRecommendedPlan, buildGrowthPlan, type BusinessGoal } from "@/features/scanIA/growthPlanEngine";
import { fmtCAD } from "./useCountUp";
import { supabase } from "@/integrations/supabase/client";
import { CONTRACTOR_PLANS, type ContractorPlanSlug } from "@/config/contractorPlans";
import { getPlanPricingBreakdown, fmtCADDollars } from "@/features/scanIA/planPricingBreakdown";
import PlanChoiceStrip from "./PlanChoiceStrip";
import { Check, Loader2, ArrowRight, ShieldCheck } from "lucide-react";

const ORDER: ContractorPlanSlug[] = ["recrue", "pro", "premium", "elite", "signature"];

export default function StepActivate() {
  const { report, goal, capacity, selectedPlan, setSelectedPlan } = useScanWizardState();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const opp = Number(report?.opportunities?.estimated_revenue ?? 0);
  const recs = useMemo(
    () => (report ? buildGrowthPlan(report as any, (goal ?? "grow_revenue") as BusinessGoal, capacity) : []),
    [report, goal, capacity],
  );
  const totalPlan = recs.reduce((s, r) => s + r.annual_value_cad, 0);
  const recommendedSlug = pickRecommendedPlan(Math.max(opp, totalPlan));
  const planSlug: ContractorPlanSlug = selectedPlan ?? recommendedSlug;
  const plan = CONTRACTOR_PLANS.find((p) => p.slug === planSlug);
  const isUpsell = ORDER.indexOf(planSlug) > ORDER.indexOf(recommendedSlug);
  const isDowngrade = ORDER.indexOf(planSlug) < ORDER.indexOf(recommendedSlug);

  async function activate() {
    if (!report || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("scan-ia-activate", {
        body: {
          report_id: report.id,
          session_token: report.session_token,
          business_name: report.business_name,
          goal,
          capacity,
          recommended_plan: planSlug,
          plan_name: plan?.name ?? "",
          plan_monthly_price_cents: (plan?.monthlyPrice ?? 0) * 100,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.url) throw new Error(data?.error ?? "Paiement indisponible.");
      window.location.href = data.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Paiement indisponible.");
      setBusy(false);
    }
  }


  return (
    <WizardShell hidePrimary>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm rounded-3xl bg-white text-[#050816] p-6 shadow-2xl">
          <div className="text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-black/40 mb-3">
              {report?.business_name}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-emerald-700 mb-1">
              Opportunité estimée
            </div>
            <div className="text-3xl font-semibold text-emerald-600 mb-4">{fmtCAD(opp)}</div>

            <div className="text-[10px] uppercase tracking-widest text-black/40 mb-1">
              Plan recommandé
            </div>
            <div className="text-2xl font-semibold mb-4">{plan?.name ?? "Premium"}</div>

            <div className="rounded-2xl bg-[#050816] text-white py-5 mb-4">
              <div className="text-[10px] uppercase tracking-widest text-amber-300 mb-1">
                Essai activation
              </div>
              <div className="text-4xl font-semibold">
                1&nbsp;$ <span className="text-sm font-normal text-white/60">/ 7 jours</span>
              </div>
            </div>

            {(() => {
              const b = getPlanPricingBreakdown(planSlug);
              if (!b) return null;
              return (
                <div
                  className="text-left border-t border-black/5 pt-4 mb-5"
                  aria-label={`Après l'essai : ${b.name} à ${b.total.toFixed(2)} dollars par mois taxes incluses`}
                >
                  <div className="text-[10px] uppercase tracking-widest text-black/40 mb-1.5">
                    Après l'essai
                  </div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-medium text-black/80">{b.name}</span>
                    <span className="text-sm text-black/60">
                      {fmtCADDollars(b.subtotal)} <span className="text-black/40">/ mois</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-black/50">
                    <span>+ TPS {fmtCADDollars(b.gst)}</span>
                    <span>+ TVQ {fmtCADDollars(b.qst)}</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-black/5">
                    <span className="text-xs font-semibold text-black/70">Total / mois</span>
                    <span className="text-base font-semibold text-black">
                      {fmtCADDollars(b.total)}
                    </span>
                  </div>
                  <div className="text-[10px] text-black/40 mt-1">Taxes incluses (QC)</div>
                </div>
              );
            })()}

            <PlanChoiceStrip
              recommended={recommendedSlug}
              selected={planSlug}
              onSelect={setSelectedPlan}
            />

            {isUpsell && (
              <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-800">
                Capacité étendue — vous captez plus d'opportunités que votre recommandation.
              </div>
            )}
            {isDowngrade && (
              <div className="mb-4 rounded-xl bg-black/[0.03] border border-black/5 px-3 py-2 text-xs text-black/60">
                Plan plus léger — capacité et visibilité réduites vs. la recommandation.
              </div>
            )}



            <ul className="space-y-2 text-left text-sm mb-5">
              {[
                "Profil IA visible sur Alex",
                "Territoires & catégories réservés",
                "Rendez-vous propriétaires qualifiés",
                "Aucun prélèvement avant le jour 8",
                "Annulation en 1 clic",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-black/70">
                  <Check className="h-4 w-4 text-emerald-600" /> {f}
                </li>
              ))}
            </ul>


            <button
              onClick={activate}
              disabled={busy}
              className="w-full h-14 rounded-2xl bg-amber-400 text-[#050816] font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.99] transition disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Redirection…
                </>
              ) : (
                <>
                  Activer maintenant <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {err && <div className="mt-3 text-xs text-red-500">{err}</div>}

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-black/40">
              <ShieldCheck className="h-3.5 w-3.5" />
              Paiement sécurisé Stripe
            </div>
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
