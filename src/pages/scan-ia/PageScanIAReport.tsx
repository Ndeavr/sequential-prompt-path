import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { AlertTriangle, TrendingUp, Loader2, ArrowRight, Sparkles } from "lucide-react";

type ScanReport = {
  id: string;
  session_token: string;
  business_name: string | null;
  city: string | null;
  category: string | null;
  overall_score: number;
  sub_scores: {
    visibility_score: number;
    trust_score: number;
    review_score: number;
    compliance_score: number;
    proof_score: number;
    activity_score: number;
  };
  opportunities: {
    waiting_homeowners: number;
    estimated_revenue: number;
    city: string;
    category: string;
  };
  threats: {
    competitors_ahead: number;
    complete_profile_competitor: string | null;
  };
  alex_simulation: {
    question: string;
    recommended: string;
    reasons: string[];
    punchline: string;
  };
};

const fmtCAD = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

export default function PageScanIAReport() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const token = sp.get("st");
  const [report, setReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/scan-ia");
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("scan_ia_reports")
        .select("*")
        .eq("session_token", token)
        .maybeSingle();
      if (error || !data) {
        navigate("/scan-ia");
        return;
      }
      setReport(data as unknown as ScanReport);
      setLoading(false);
    })();
  }, [token, navigate]);

  const activate = async () => {
    if (!report || checkingOut) return;
    setCheckingOut(true);
    const { data, error } = await supabase.functions.invoke("scan-ia-activate", {
      body: {
        report_id: report.id,
        session_token: report.session_token,
        business_name: report.business_name,
      },
    });
    if (error || !data?.url) {
      setCheckingOut(false);
      alert("Checkout indisponible pour le moment.");
      return;
    }
    window.location.href = data.url;
  };

  if (loading || !report) {
    return (
      <div className="alex-immersive flex min-h-screen items-center justify-center bg-[#050816] text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const subs = [
    { label: "Visibilité locale", value: report.sub_scores.visibility_score },
    { label: "Confiance", value: report.sub_scores.trust_score },
    { label: "Conformité", value: report.sub_scores.compliance_score },
    { label: "Preuves de travaux", value: report.sub_scores.proof_score },
    { label: "Avis", value: report.sub_scores.review_score },
    { label: "Site web", value: report.sub_scores.activity_score },
  ];

  return (
    <div className="alex-immersive min-h-screen bg-[#050816] text-readable">
      <Helmet>
        <title>Votre score IA — {report.business_name}</title>
      </Helmet>

      <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <div className="mb-8 text-xs uppercase tracking-widest text-white/50">
          Rapport Scan IA · {report.business_name}
        </div>

        {/* Score global */}
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur">
          <div className="mb-4 text-sm text-white/60">Score UNPRO IA</div>
          <div className="flex items-baseline gap-3">
            <div className="text-6xl font-semibold text-white md:text-7xl">
              {report.overall_score}
            </div>
            <div className="text-2xl text-white/40">/ 100</div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
            {subs.map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-xs text-white/60">{s.label}</span>
                  <span className="text-sm font-medium text-white">{s.value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-300 to-blue-500"
                    style={{ width: `${s.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Opportunités */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.06] p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-300">
              <TrendingUp className="h-4 w-4" />
              Opportunités détectées
            </div>
            <div className="text-2xl font-semibold text-white">
              {report.opportunities.waiting_homeowners} demandes en attente
            </div>
            <div className="mt-1 text-sm text-white/60">
              dans votre secteur — {report.opportunities.city} · {report.opportunities.category}
            </div>
            <div className="mt-4 text-xs text-white/50">Valeur estimée</div>
            <div className="text-xl font-medium text-white">
              {fmtCAD(report.opportunities.estimated_revenue)}
            </div>
          </div>

          <div className="rounded-3xl border border-amber-400/20 bg-amber-400/[0.06] p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              Menaces détectées
            </div>
            <div className="text-2xl font-semibold text-white">
              {report.threats.competitors_ahead} concurrents
            </div>
            <div className="mt-1 text-sm text-white/60">apparaissent avant vous.</div>
            {report.threats.complete_profile_competitor && (
              <div className="mt-4 text-sm text-white/70">
                <span className="text-white/50">Profil IA complet : </span>
                {report.threats.complete_profile_competitor}
              </div>
            )}
          </div>
        </div>

        {/* Ce que voit Alex */}
        <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/10 to-blue-500/5 p-8 backdrop-blur">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-sky-300">
            <Sparkles className="h-4 w-4" />
            Ce que voit Alex
          </div>
          <div className="mb-4 text-white/80">
            Un propriétaire demande : <em className="text-white">« {report.alex_simulation.question} »</em>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="mb-2 text-xs uppercase tracking-widest text-white/40">
              Entreprise recommandée
            </div>
            <div className="text-xl font-semibold text-white">
              {report.alex_simulation.recommended}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {report.alex_simulation.reasons.map((r) => (
                <span
                  key={r}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-5 text-lg font-medium text-amber-300">
            {report.alex_simulation.punchline}
          </div>
        </div>

        {/* Activation */}
        <div className="rounded-3xl border border-white/10 bg-white p-8 text-[#050816]">
          <div className="mb-2 text-xs uppercase tracking-widest text-[#050816]/50">
            Offre d'activation
          </div>
          <h2 className="mb-2 text-3xl font-semibold">Activation IA</h2>
          <div className="mb-6 flex items-baseline gap-2">
            <span className="text-5xl font-semibold">1 $</span>
            <span className="text-[#050816]/60">pendant 7 jours</span>
          </div>
          <ul className="mb-6 grid grid-cols-1 gap-2 text-sm text-[#050816]/80 md:grid-cols-2">
            {[
              "Profil IA",
              "Territoires",
              "Catégories",
              "Vérification conformité",
              "Apparition dans Alex",
              "Réception de rendez-vous",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#050816]" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={activate}
            disabled={checkingOut}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#050816] px-8 py-4 text-base font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {checkingOut ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Redirection…
              </>
            ) : (
              <>
                Activer maintenant <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
