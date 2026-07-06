/**
 * /isolation-qc — First-Dollar Sprint landing (isolation QC).
 * Ultra-minimal: headline + 1 button → Stripe Checkout in <60s.
 */
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, ShieldCheck, MapPin, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { redirectToCheckout } from "@/lib/redirectToCheckout";

const SPRINT_SLUG = "sprint-isolation-qc";

async function logEvent(event: string, payload: Record<string, unknown>) {
  try {
    await supabase.from("first_dollar_sprint_events").insert({
      event,
      campaign_variant: (payload.camp as string) ?? null,
      city: (payload.city as string) ?? null,
      category: "isolation",
      session_id: (payload.session_id as string) ?? null,
      metadata: payload,
    });
  } catch {
    /* best-effort */
  }
}

export default function PageProIsolationQC() {
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const utm = useMemo(
    () => ({
      src: params.get("src") ?? "direct",
      camp: params.get("camp") ?? "",
      city: params.get("city") ?? "",
      company: params.get("company") ?? "",
    }),
    [params],
  );

  useEffect(() => {
    logEvent("landing_viewed", utm);
  }, [utm]);

  const activate = async () => {
    setLoading(true);
    setErr(null);
    logEvent("checkout_opened", utm);
    try {
      const { data, error } = await supabase.functions.invoke("create-activation-checkout", {
        body: {
          slug: SPRINT_SLUG,
          source: "isolation-qc",
          utm,
        },
      });
      if (error || !data?.url) {
        setErr("Activation temporairement indisponible — réessayez dans 10 secondes.");
        return;
      }
      redirectToCheckout(data.url);
    } catch {
      setErr("Activation temporairement indisponible — réessayez dans 10 secondes.");
    } finally {
      setLoading(false);
    }
  };

  const cityLabel = utm.city ? utm.city.replace(/-/g, " ") : "votre secteur";

  return (
    <div className="min-h-screen bg-[#0B1220] text-white flex items-center justify-center px-5 py-10">
      <Helmet>
        <title>Rendez-vous exclusifs en isolation — 1 $ pour 7 jours | UNPRO</title>
        <meta
          name="description"
          content="Recevez des rendez-vous exclusifs en isolation au Québec. Essai 7 jours pour 1 $. Aucun lead partagé."
        />
      </Helmet>

      <main className="w-full max-w-md">
        <div className="mb-6 text-[11px] uppercase tracking-widest text-white/50">
          UNPRO · Isolation Québec
        </div>

        <h1
          className="text-[32px] md:text-[40px] font-extrabold leading-[1.05] mb-4"
          style={{ letterSpacing: "-0.03em" }}
        >
          Recevez des rendez-vous exclusifs en isolation.
          <br />
          <span className="text-white/60">Pas des leads partagés.</span>
        </h1>

        <p className="text-[15px] text-white/75 mb-8">
          Essai 7 jours — <span className="font-semibold text-white">1 $</span>.
          Payez seulement pour activer votre profil.
        </p>

        <button
          onClick={activate}
          disabled={loading}
          className="w-full rounded-2xl bg-white text-[#0B1220] font-semibold text-[16px] py-4 flex items-center justify-center gap-2 hover:bg-white/95 transition disabled:opacity-60"
        >
          {loading ? "Préparation…" : (
            <>
              Activer pour 1 $ <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>

        {err && <p className="mt-3 text-[13px] text-rose-300">{err}</p>}

        <ul className="mt-8 space-y-3 text-[13.5px] text-white/70">
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-300 shrink-0" />
            Demandes actives cette semaine à {cityLabel}
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0" />
            Entreprises vérifiées (RBQ, avis, activité)
          </li>
          <li className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-emerald-300 shrink-0" />
            Annulation en un clic pendant l'essai
          </li>
        </ul>

        <p className="mt-10 text-[11px] text-white/40">
          Paiement sécurisé via Stripe · 1 $ aujourd'hui, aucun engagement pendant 7 jours.
        </p>
      </main>
    </div>
  );
}
