/**
 * /pro/diagnostic/:slug/merci — Post-payment confirmation.
 * Polls outbound-checkout-verify with session_id, publishes contractor, shows success.
 */
import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, ExternalLink } from "lucide-react";

export default function PageOutboundLandingSuccess() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const token = params.get("t");
  const [status, setStatus] = useState<"loading" | "ok" | "pending" | "error">("loading");
  const [contractor, setContractor] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !slug || !token) { setStatus("error"); setErr("Lien invalide"); return; }
    let cancelled = false;
    let attempts = 0;
    async function tick() {
      attempts += 1;
      try {
        const { data, error } = await supabase.functions.invoke("outbound-checkout-verify", {
          body: { session_id: sessionId, slug, token },
        });
        if (error) throw error;
        if (cancelled) return;
        if (data?.paid && data?.published) {
          setContractor(data.contractor);
          setStatus("ok");
          return;
        }
        if (attempts < 8) {
          setStatus("pending");
          setTimeout(tick, 1500);
        } else {
          setStatus("error");
          setErr("Le paiement est en cours de validation. Rechargez la page dans une minute.");
        }
      } catch (e: any) {
        if (!cancelled) { setStatus("error"); setErr(e.message); }
      }
    }
    tick();
    return () => { cancelled = true; };
  }, [sessionId, slug, token]);

  return (
    <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-6">
        {status === "loading" || status === "pending" ? (
          <>
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-cyan-300" />
            <h1 className="text-2xl font-semibold tracking-tight">Activation de votre profil…</h1>
            <p className="text-white/60 text-sm">Quelques secondes pour finaliser votre publication.</p>
          </>
        ) : status === "ok" ? (
          <>
            <CheckCircle2 className="w-14 h-14 mx-auto text-cyan-300" />
            <h1 className="text-3xl font-semibold tracking-tight">Votre profil est en ligne.</h1>
            <p className="text-white/70">Bienvenue chez UNPRO, {contractor?.business_name}.</p>
            {contractor?.slug && (
              <a
                href={`https://unpro.ca/entrepreneur/${contractor.slug}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 bg-cyan-400 text-[#050816] rounded-[18px] px-6 py-3 font-medium hover:-translate-y-0.5 transition"
              >
                Voir mon profil public <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <p className="text-xs text-white/40 pt-4">Un email de bienvenue vient d'être envoyé avec les prochaines étapes.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Validation en cours</h1>
            <p className="text-white/60 text-sm">{err}</p>
          </>
        )}
      </div>
    </div>
  );
}
