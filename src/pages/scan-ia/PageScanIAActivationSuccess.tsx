import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

export default function PageScanIAActivationSuccess() {
  const [sp] = useSearchParams();
  const token = sp.get("st");
  const sessionId = sp.get("cs");
  const [status, setStatus] = useState<"pending" | "paid" | "error">(sessionId ? "pending" : "paid");

  useEffect(() => {
    if (!sessionId || !token) return;
    let attempts = 0;
    let cancelled = false;
    const tick = async () => {
      attempts += 1;
      const { data, error } = await supabase.functions.invoke("scan-ia-activation-confirm", {
        body: { session_id: sessionId, session_token: token },
      });
      if (cancelled) return;
      if (!error && data?.paid) {
        setStatus("paid");
        return;
      }
      if (attempts < 8) {
        setTimeout(tick, 1500);
      } else {
        setStatus("error");
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [sessionId, token]);

  return (
    <div className="alex-immersive flex min-h-screen items-center justify-center bg-[#050816] px-6 text-readable">
      <Helmet>
        <title>Activation confirmée — UNPRO</title>
      </Helmet>

      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur">
        {status === "pending" ? (
          <>
            <Loader2 className="mx-auto mb-6 h-10 w-10 animate-spin text-sky-400" />
            <h1 className="mb-3 text-2xl font-semibold text-white">Confirmation du paiement…</h1>
            <p className="text-white/60 text-sm">Encore quelques secondes.</p>
          </>
        ) : status === "error" ? (
          <>
            <h1 className="mb-3 text-2xl font-semibold text-white">Nous vérifions votre paiement</h1>
            <p className="mb-6 text-white/70 text-sm">
              Cela peut prendre une minute. Vous pouvez créer votre compte dès maintenant.
            </p>
            <Link
              to={`/signup?scan=${encodeURIComponent(token ?? "")}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-[#050816]"
            >
              Créer mon compte <ArrowRight className="h-5 w-5" />
            </Link>
          </>
        ) : (
          <>
            <CheckCircle2 className="mx-auto mb-6 h-14 w-14 text-emerald-400" />
            <h1 className="mb-3 text-3xl font-semibold text-white">Activation confirmée</h1>
            <p className="mb-8 text-white/70">
              Votre profil IA est en cours d'activation. Créez votre compte pour finaliser
              votre configuration et commencer à recevoir des rendez-vous.
            </p>
            <Link
              to={`/signup?scan=${encodeURIComponent(token ?? "")}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-[#050816] transition hover:-translate-y-0.5"
            >
              Créer mon compte <ArrowRight className="h-5 w-5" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
