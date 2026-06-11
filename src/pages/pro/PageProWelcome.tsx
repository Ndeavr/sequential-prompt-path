/**
 * /pro/welcome — Page succès après paiement Fondateur.
 */
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackFirstCustomerEvent } from "@/utils/trackFirstCustomerEvent";

const STEPS = [
  { label: "Analyse IA de votre entreprise", status: "active" },
  { label: "Vérification entreprise (NEQ, RBQ)", status: "pending" },
  { label: "Optimisation profil propriétaires", status: "pending" },
  { label: "Activation des recommandations", status: "pending" },
];

export default function PageProWelcome() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get("session_id");
  const prospectId = params.get("prospect");

  useEffect(() => {
    trackFirstCustomerEvent("checkout_completed", {
      session_id: sessionId,
      prospect_id: prospectId,
    });
    // Best-effort mark prospect as paid (Stripe webhook is the source of truth).
    if (prospectId) {
      supabase
        .from("founder_score_prospects" as any)
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", prospectId)
        .then(() => trackFirstCustomerEvent("founder_paid", { prospect_id: prospectId }));
    }
  }, [sessionId, prospectId]);

  return (
    <>
      <Helmet>
        <title>Bienvenue parmi les Fondateurs UNPRO</title>
      </Helmet>
      <div className="min-h-screen px-4 py-10 md:py-16" style={{ background: "#0B1220" }}>
        <div className="max-w-xl mx-auto">
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider mb-3"
            style={{
              background: "rgba(245,200,90,0.16)",
              color: "#F5C85A",
              border: "1px solid rgba(245,200,90,0.35)",
            }}
          >
            <Sparkles size={11} /> Profil activé
          </div>
          <h1
            className="text-[26px] md:text-[34px] font-extrabold mb-3"
            style={{ color: "#fff", letterSpacing: "-0.03em" }}
          >
            Bienvenue parmi les entreprises fondatrices UNPRO.
          </h1>
          <p className="text-[14px] mb-6" style={{ color: "rgba(255,255,255,0.78)" }}>
            Alex commence maintenant l'analyse de votre profil.
          </p>

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
            {STEPS.map((s, i) => (
              <div key={s.label} className="flex items-start gap-3">
                <CheckCircle2
                  size={20}
                  className="mt-0.5 flex-shrink-0"
                  style={{
                    color: i === 0 ? "#10B981" : "rgba(255,255,255,0.3)",
                  }}
                />
                <div>
                  <div className="text-[14px] font-semibold" style={{ color: "#fff" }}>
                    {s.label}
                  </div>
                  <div className="text-[11.5px] mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {i === 0 ? "En cours…" : "Bientôt"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate("/")}
            className="mt-6 w-full px-5 py-3.5 rounded-2xl font-bold text-[14px] transition-transform hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #2563FF 0%, #3B82F6 100%)",
              color: "#fff",
            }}
          >
            Découvrir UNPRO
          </button>
        </div>
      </div>
    </>
  );
}
