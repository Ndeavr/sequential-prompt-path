/**
 * /admin/first-dollar — historical acquisition diagnostic events.
 * This view NEVER certifies a unique CAD350 Stripe LIVE purchase or entitlement.
 */
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  useFirstDollarFunnel,
  FUNNEL_STAGES,
  type FunnelPeriod,
} from "@/hooks/useFirstDollarFunnel";
import { supabase } from "@/integrations/supabase/client";

const PERIODS: { key: FunnelPeriod; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7d", label: "7 jours" },
  { key: "all", label: "Total" },
];

export default function PageAdminFirstDollar() {
  const [period, setPeriod] = useState<FunnelPeriod>("today");
  const { data: counts, isLoading, refetch } = useFirstDollarFunnel(period);
  const [latestReport, setLatestReport] = useState<any>(null);

  useEffect(() => {
    supabase
      .from("first_dollar_daily_reports" as any)
      .select("*")
      .order("report_date", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setLatestReport(data));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 sm:px-6 py-8">
      <Helmet><title>First Dollar — télémétrie non vérifiée</title></Helmet>

      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">First Dollar — diagnostic</h1>
            <p className="text-sm text-slate-400 mt-1">
              Événements historiques bruts. Ce tableau ne compte ni entreprises uniques payantes
              ni activations de 350 $ confirmées.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/admin/first-dollar/batches"
              className="text-sm px-4 py-2 rounded-lg bg-white text-slate-950 font-semibold hover:bg-slate-100"
            >
              Gestion des lots
            </Link>
            <button
              onClick={() => refetch()}
              className="text-sm px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15"
            >
              {isLoading ? "…" : "Rafraîchir"}
            </button>
          </div>
        </header>

        <div className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-1.5 text-sm rounded-lg transition ${
                period === p.key ? "bg-white text-slate-950 font-semibold" : "text-slate-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {FUNNEL_STAGES.map((stage, i) => {
            const count = counts?.[stage.key];
            return (
              <div key={stage.key} className="rounded-xl p-3 border border-white/10 bg-white/[0.03]">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  {i + 1}. {stage.label}
                </div>
                <div className="text-3xl font-bold mt-1 tabular-nums">
                  {isLoading || count === undefined ? "…" : count}
                </div>
                <div className="text-[11px] mt-1 text-slate-500">Signal brut, non dédupliqué</div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
          <div className="font-semibold text-white">Paiements 350 $ vérifiés : indéterminés dans cette vue</div>
          <p className="text-sm text-slate-300 mt-1">
            Les signaux de paiement et d’activation ci-dessus sont non vérifiés : un statut CRM
            « PAID », une redirection de succès ou un événement applicatif ne prouvent jamais
            une vente réellement réglée.
          </p>
        </div>

        {latestReport && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">
              Rapport historique non réconcilié · {latestReport.report_date}
            </div>
            <div className="text-sm text-slate-200">
              Étape indiquée comme abandon : {latestReport.top_dropoff}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Les volumes de ces étapes ne suivent pas nécessairement la même cohorte;
              aucun taux de conversion payé ne peut être déduit.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
          <div className="font-semibold text-white mb-2 flex items-center gap-2">
            <ArrowRight className="h-4 w-4" /> Vérification financière indépendante requise
          </div>
          <p>
            Rapprocher serveur par serveur Stripe LIVE réglé à 350 $ CA hors taxes, webhook
            signé et traité, bonne entreprise légale unique, droits effectifs de 12 mois,
            remboursements et litiges. Les états Checkout, Webhook et Entitlement sont
            inconnus ici et ne sont pas reconstruits à partir des signaux de paiement.
          </p>
        </div>
      </div>
    </div>
  );
}
