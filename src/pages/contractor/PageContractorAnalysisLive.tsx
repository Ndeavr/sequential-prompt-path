/**
 * /contractor/analysis?run=<id> — live realtime view of the activation pipeline.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/formatPrice";

interface RunRow {
  id: string;
  domain: string | null;
  pipeline_status: string;
  current_step: string;
  screenshot_url: string | null;
  signals: Record<string, unknown>;
  extraction: Record<string, unknown>;
  aipp_score: number | null;
  aipp_breakdown: Record<string, number>;
  recommended_plan: string | null;
  recommendation: { reason?: string; projected_appointments?: number } | null;
  partial_confidence: boolean;
  error_log: Array<{ step: string; message: string }>;
}

const STEPS: Array<{ key: string; label: string }> = [
  { key: "extraction", label: "Analyse du site web" },
  { key: "scoring", label: "Calcul du score AIPP" },
  { key: "recommendation", label: "Recommandation du plan" },
  { key: "ready", label: "Prêt à activer" },
];

const PLAN_LABEL: Record<string, string> = {
  pro: "Pro",
  premium: "Premium",
  elite: "Élite",
  signature: "Signature",
};
const PLAN_PRICE: Record<string, number> = {
  pro: 349,
  premium: 599,
  elite: 999,
  signature: 1799,
};

export default function PageContractorAnalysisLive() {
  const [params] = useSearchParams();
  const runId = params.get("run");
  const navigate = useNavigate();
  const [run, setRun] = useState<RunRow | null>(null);

  useEffect(() => {
    if (!runId) return;

    let active = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const fetchRun = async () => {
      const { data, error } = await supabase
        .from("activation_pipeline_runs")
        .select("*")
        .eq("id", runId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        console.warn("[analysis-live] fetch error", error);
        return;
      }
      if (data) {
        setRun(data as unknown as RunRow);
        const status = (data as { pipeline_status?: string }).pipeline_status;
        if ((status === "ready" || status === "failed") && pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }
    };

    // Immediate fetch + polling fallback (every 2s) so the UI always catches up
    // even if the realtime channel drops the update.
    fetchRun();
    pollTimer = setInterval(fetchRun, 2000);

    const channel = supabase
      .channel(`activation_run_${runId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "activation_pipeline_runs",
          filter: `id=eq.${runId}`,
        },
        (payload) => setRun(payload.new as unknown as RunRow),
      )
      .subscribe();

    return () => {
      active = false;
      if (pollTimer) clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [runId]);

  const stepIdx = useMemo(() => {
    if (!run) return 0;
    if (run.current_step === "ready" || run.pipeline_status === "ready") {
      return STEPS.length;
    }
    const i = STEPS.findIndex((s) => s.key === run.current_step);
    return i < 0 ? 0 : i;
  }, [run]);

  if (!runId) {
    return (
      <main className="min-h-screen bg-[#060B14] text-white flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-white/70">Aucune session d'activation.</p>
          <button
            onClick={() => navigate("/contractor/join")}
            className="mt-4 rounded-xl bg-amber-400 text-[#060B14] px-5 py-2.5 text-sm font-semibold"
          >
            Recommencer
          </button>
        </div>
      </main>
    );
  }

  const score = run?.aipp_score ?? null;
  const buckets = run?.aipp_breakdown ?? {};
  const plan = run?.recommended_plan ?? null;
  const ready = run?.pipeline_status === "ready";
  const projected = run?.recommendation?.projected_appointments ?? 0;
  const planPrice = plan ? PLAN_PRICE[plan] ?? 0 : 0;
  const monthlyValueRdv = projected * 1500 * 0.4; // close-rate baseline

  return (
    <main className="min-h-screen bg-[#060B14] text-white pb-32">
      <div className="max-w-2xl mx-auto px-5 pt-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{run?.domain ?? "Analyse en cours"}</span>
        </div>
        <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight">
          Analyse intelligente en direct
        </h1>

        {/* Live feed */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5">
          {STEPS.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx && !ready;
            return (
              <div key={s.key} className="flex items-center gap-3 text-sm">
                {done
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  : active
                  ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  : (
                    <div className="w-4 h-4 rounded-full border border-white/20" />
                  )}
                <span
                  className={done
                    ? "text-white/90"
                    : active
                    ? "text-white"
                    : "text-white/40"}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </section>

        {/* Screenshot */}
        {run?.screenshot_url && (
          <section className="mt-5 rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03]">
            <img
              src={run.screenshot_url}
              alt={`Capture de ${run.domain}`}
              loading="lazy"
              className="w-full h-auto block"
            />
          </section>
        )}

        {/* AIPP orb */}
        {score !== null && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-amber-400/10 to-transparent p-6 text-center">
            <p className="text-xs uppercase tracking-wider text-white/50">
              Votre score AIPP
            </p>
            <p className="mt-2 text-6xl font-semibold text-amber-400 tabular-nums">
              {Math.round(Number(score))}
              <span className="text-2xl text-white/40">/100</span>
            </p>
            <p className="mt-2 text-sm text-white/70">
              {Number(score) >= 70
                ? "Excellente présence numérique."
                : Number(score) >= 50
                ? "Bonne base, marge de progression réelle."
                : "Forte opportunité d'optimisation IA."}
            </p>
            {run?.partial_confidence && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-300/80">
                <AlertTriangle className="w-3 h-3" />
                Données partielles — confiance limitée.
              </p>
            )}

            {/* Buckets */}
            <div className="mt-5 grid grid-cols-5 gap-2">
              {Object.entries(buckets).map(([k, v]) => (
                <div key={k} className="text-center">
                  <p className="text-xs text-white/50 capitalize">
                    {k.replace("_", " ")}
                  </p>
                  <p className="text-sm font-semibold text-white tabular-nums">
                    {Math.round(Number(v))}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Plan reco */}
        {plan && (
          <section className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/[0.04] p-5">
            <p className="text-xs uppercase tracking-wider text-amber-300">
              Plan recommandé
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">
              UNPRO {PLAN_LABEL[plan]}
            </p>
            <p className="mt-2 text-sm text-white/70 leading-snug">
              {run?.recommendation?.reason}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-xs text-white/50">Rendez-vous qualifiés</p>
                <p className="text-lg font-semibold tabular-nums">
                  {projected}/mois
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-xs text-white/50">Valeur potentielle</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatPrice(monthlyValueRdv)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-white/40">
              Tarif courant : {formatPrice(planPrice)} / mois.
            </p>
          </section>
        )}
      </div>

      {/* Sticky CTA */}
      {ready && plan && (
        <div className="fixed bottom-0 inset-x-0 border-t border-white/10 bg-[#060B14]/95 backdrop-blur p-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() =>
                navigate(`/fondateur/plans?from=${runId}&plan=${plan}`)}
              className="w-full rounded-2xl bg-amber-400 text-[#060B14] py-4 text-base font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition"
            >
              Activer mon profil — {formatPrice(1)} aujourd'hui
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="mt-2 text-center text-[11px] text-white/40">
              Fondateur UNPRO — accès privilégié activé
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
