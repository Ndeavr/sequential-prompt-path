import { useMemo, useState } from "react";
import WizardShell from "./WizardShell";
import { useScanWizardState } from "./useScanWizardState";
import { pickRecommendedPlan, buildGrowthPlan, type BusinessGoal } from "@/features/scanIA/growthPlanEngine";
import { fmtCAD } from "./useCountUp";
import { supabase } from "@/integrations/supabase/client";
import { CONTRACTOR_PLANS } from "@/config/contractorPlans";
import { Check, Loader2, ArrowRight, ShieldCheck } from "lucide-react";

export default function StepActivate() {
  const { report, goal, capacity } = useScanWizardState();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const opp = Number(report?.opportunities?.estimated_revenue ?? 0);
  const recs = useMemo(
    () => (report ? buildGrowthPlan(report as any, (goal ?? "grow_revenue") as BusinessGoal, capacity) : []),
    [report, goal, capacity],
  );
  const totalPlan = recs.reduce((s, r) => s + r.annual_value_cad, 0);
  const planSlug = pickRecommendedPlan(Math.max(opp, totalPlan));
  const plan = CONTRACTOR_PLANS.find((p) => p.slug === planSlug);

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

            <ul className="space-y-2 text-left text-sm mb-5">
              {[
                "Profil IA visible sur Alex",
                "Territoires & catégories réservés",
                "Rendez-vous propriétaires qualifiés",
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
