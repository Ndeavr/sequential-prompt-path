/**
 * /pro/welcome — Page succès post-paiement Fondateur.
 * Vérifie Stripe → marque le prospect payé → anime l'analyse 4 étapes →
 * redirige vers /pro/profile/public/:contractorId.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackFirstCustomerEvent } from "@/utils/trackFirstCustomerEvent";

type StepStatus = "pending" | "running" | "completed";
type Step = { label: string; status: StepStatus };

const INITIAL_STEPS: Step[] = [
  { label: "Analyse IA de votre entreprise", status: "pending" },
  { label: "Vérification NEQ / RBQ", status: "pending" },
  { label: "Création du profil propriétaire", status: "pending" },
  { label: "Activation des recommandations", status: "pending" },
];

type Verify =
  | { kind: "loading" }
  | { kind: "pending" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      contractorId: string | null;
      company?: string | null;
      email?: string | null;
    };

export default function PageProWelcome() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get("session_id");
  const prospectId = params.get("prospect");
  const [verify, setVerify] = useState<Verify>({ kind: "loading" });
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [done, setDone] = useState(false);

  // 1) Verify Stripe session
  useEffect(() => {
    if (!sessionId) {
      setVerify({ kind: "error", message: "Session de paiement manquante." });
      return;
    }
    let cancelled = false;
    let attempts = 0;

    const tick = async () => {
      attempts += 1;
      try {
        const { data, error } = await supabase.functions.invoke(
          "pro-founder-verify-session",
          { body: { sessionId } },
        );
        if (cancelled) return;
        if (error) throw error;
        const res = data as any;
        if (res?.paid) {
          trackFirstCustomerEvent("founder_paid_confirmed", {
            session_id: sessionId,
            prospect_id: prospectId,
          });
          setVerify({
            kind: "ok",
            contractorId: res.contractor_id ?? res.prospect_id ?? null,
            company: res.company,
            email: res.email,
          });
          return;
        }
        if (attempts < 8) setTimeout(tick, 1500);
        else setVerify({ kind: "pending" });
      } catch (e) {
        if (cancelled) return;
        setVerify({
          kind: "error",
          message: e instanceof Error ? e.message : "Vérification impossible.",
        });
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [sessionId, prospectId]);

  // 2) Animate 4 steps once payment is confirmed
  useEffect(() => {
    if (verify.kind !== "ok") return;
    let i = 0;
    const advance = () => {
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx < i ? { ...s, status: "completed" } :
          idx === i ? { ...s, status: "running" } : s,
        ),
      );
      if (i >= INITIAL_STEPS.length) {
        setSteps((prev) => prev.map((s) => ({ ...s, status: "completed" })));
        setDone(true);
        return;
      }
      setTimeout(() => {
        i += 1;
        advance();
      }, 2000);
    };
    advance();
  }, [verify.kind]);

  const goToProfile = () => {
    if (verify.kind === "ok" && verify.contractorId) {
      navigate(`/pro/profile/public/${verify.contractorId}`);
    } else {
      navigate("/pro");
    }
  };

  const confirmed = verify.kind === "ok";

  return (
    <>
      <Helmet>
        <title>Activation en cours — UNPRO Fondateur</title>
      </Helmet>
      <div className="min-h-screen px-4 py-10 md:py-16" style={{ background: "#0B1220" }}>
        <div className="max-w-xl mx-auto">
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider mb-3"
            style={{
              background: confirmed ? "rgba(245,200,90,0.16)" : "rgba(255,255,255,0.06)",
              color: confirmed ? "#F5C85A" : "rgba(255,255,255,0.7)",
              border: `1px solid ${confirmed ? "rgba(245,200,90,0.35)" : "rgba(255,255,255,0.18)"}`,
            }}
          >
            {confirmed ? <Sparkles size={11} /> : <Loader2 size={11} className="animate-spin" />}
            {confirmed ? "Profil activé" : "Confirmation du paiement…"}
          </div>

          <h1
            className="text-[26px] md:text-[34px] font-extrabold mb-3"
            style={{ color: "#fff", letterSpacing: "-0.03em" }}
          >
            {confirmed
              ? "Bienvenue parmi les entreprises fondatrices UNPRO."
              : "Nous confirmons votre paiement…"}
          </h1>
          <p className="text-[14px] mb-6" style={{ color: "rgba(255,255,255,0.78)" }}>
            {confirmed
              ? "Alex prépare votre profil professionnel."
              : "Vous serez redirigé automatiquement dès la confirmation Stripe."}
          </p>

          {verify.kind === "error" && (
            <div
              className="rounded-2xl p-4 mb-5 flex items-start gap-3"
              style={{
                background: "rgba(255,80,80,0.10)",
                border: "1px solid rgba(255,120,120,0.35)",
              }}
            >
              <AlertTriangle size={18} className="text-red-300 mt-0.5" />
              <div className="text-[13px] text-red-200">{verify.message}</div>
            </div>
          )}

          <div
            className="rounded-3xl p-5 md:p-6 border space-y-3"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(20px)",
            }}
          >
            <h3 className="text-[13px] font-extrabold uppercase tracking-wider mb-2" style={{ color: "#F5C85A" }}>
              Prochaines étapes
            </h3>
            {steps.map((s) => {
              const isDone = s.status === "completed";
              const isRunning = s.status === "running";
              return (
                <div key={s.label} className="flex items-start gap-3">
                  {isRunning ? (
                    <Loader2 size={20} className="mt-0.5 flex-shrink-0 animate-spin" style={{ color: "#F5C85A" }} />
                  ) : (
                    <CheckCircle2
                      size={20}
                      className="mt-0.5 flex-shrink-0"
                      style={{ color: isDone ? "#10B981" : "rgba(255,255,255,0.25)" }}
                    />
                  )}
                  <div>
                    <div className="text-[14px] font-semibold" style={{ color: "#fff" }}>
                      {s.label}
                    </div>
                    <div className="text-[11.5px] mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {isDone ? "Terminé" : isRunning ? "En cours…" : "En attente"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {done && confirmed && (
            <p className="text-[13.5px] text-center mt-6" style={{ color: "rgba(255,255,255,0.85)" }}>
              Votre profil UNPRO est actif.
            </p>
          )}

          <button
            onClick={goToProfile}
            disabled={!done || !confirmed}
            className="mt-6 w-full px-5 py-3.5 rounded-2xl font-bold text-[14px] transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #F5C85A 0%, #D4AF37 100%)",
              color: "#0B1220",
              boxShadow: "0 10px 24px -8px rgba(245,200,90,0.6)",
            }}
          >
            {done && confirmed ? "Voir mon profil actif →" : "Préparation…"}
          </button>
        </div>
      </div>
    </>
  );
}
