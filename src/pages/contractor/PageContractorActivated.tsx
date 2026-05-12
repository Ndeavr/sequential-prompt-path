/**
 * /contractor/activated — confirms Stripe payment + activates founder profile.
 */
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type State =
  | { kind: "loading" }
  | { kind: "ok"; contractorId: string | null; runId: string }
  | { kind: "pending" }
  | { kind: "error"; message: string };

export default function PageContractorActivated() {
  const [params] = useSearchParams();
  const sessionId = params.get("session");
  const runId = params.get("run");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!sessionId || !runId) {
      setState({ kind: "error", message: "Session manquante." });
      return;
    }
    let cancelled = false;
    let attempts = 0;

    const tick = async () => {
      attempts += 1;
      try {
        const { data, error } = await supabase.functions.invoke(
          "activation-confirm",
          { body: { session_id: sessionId, run_id: runId } },
        );
        if (cancelled) return;
        if (error) throw error;
        const res = data as { paid?: boolean; contractor_id?: string | null };
        if (res?.paid) {
          setState({
            kind: "ok",
            contractorId: res.contractor_id ?? null,
            runId,
          });
          return;
        }
        if (attempts < 8) {
          setTimeout(tick, 1500);
        } else {
          setState({ kind: "pending" });
        }
      } catch (e) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Erreur de confirmation.",
        });
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [sessionId, runId]);

  return (
    <main className="min-h-screen bg-[#060B14] text-white flex items-center justify-center px-5">
      <div className="w-full max-w-md text-center">
        {state.kind === "loading" && (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
            <p className="mt-4 text-white/70 text-sm">
              Confirmation du paiement…
            </p>
          </>
        )}
        {state.kind === "pending" && (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
            <p className="mt-4 text-white/70 text-sm">
              Paiement en cours de traitement. Cette page se mettra à jour dès
              la confirmation Stripe.
            </p>
          </>
        )}
        {state.kind === "ok" && (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-400/15 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">
              Profil Fondateur activé
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Bienvenue dans UNPRO. Votre profil est en ligne. Complétez les
              dernières informations pour recevoir vos premiers rendez-vous.
            </p>
            <Link
              to={`/pro/onboarding?run=${state.runId}${
                state.contractorId ? `&c=${state.contractorId}` : ""
              }`}
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 text-[#060B14] px-5 py-3.5 text-sm font-semibold"
            >
              Compléter mon profil <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        )}
        {state.kind === "error" && (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-red-400/15 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <h1 className="mt-5 text-xl font-semibold">
              Confirmation impossible
            </h1>
            <p className="mt-2 text-sm text-red-300/80">{state.message}</p>
            <Link
              to={`/contractor/analysis?run=${runId ?? ""}`}
              className="mt-6 inline-flex items-center gap-2 text-sm text-white/70 underline"
            >
              Revenir à l'analyse
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
