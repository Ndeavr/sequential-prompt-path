/**
 * /unpro/activate/:token — Page d'activation reçue par SMS/courriel.
 * Route publique (aucun garde d'authentification). Résout le jeton d'outreach,
 * affiche l'entreprise réelle, puis lance le paiement d'activation de 1 $.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, ShieldCheck, Sparkles, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { redirectToCheckout } from "@/lib/redirectToCheckout";
import { Button } from "@/components/ui/button";

interface ResolvedProspect {
  id: string;
  business_name: string | null;
  city: string | null;
  category: string | null;
  email: string | null;
}

const BENEFITS = [
  "Profil optimisé pour les IA et les propriétaires",
  "Recommandations dans votre territoire",
  "Tableau de bord et suivi des demandes",
  "Aucun renouvellement automatique",
];

export default function PageUnproActivate() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<"loading" | "ready" | "invalid" | "error">("loading");
  const [prospect, setProspect] = useState<ResolvedProspect | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState("invalid");
      setReason("missing_token");
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("activation-token-resolve", {
          body: { token },
        });
        if (cancelled) return;
        if (error || !data?.ok) {
          const serverReason =
            (data as { reason?: string } | null)?.reason ?? (error ? "network_error" : "unknown");
          // eslint-disable-next-line no-console
          console.error("[ACTIVATION_RESOLVE_FAILED]", { token, reason: serverReason, error });
          setReason(serverReason);
          setState(
            serverReason === "lookup_failed" ||
              serverReason === "internal_error" ||
              serverReason === "network_error"
              ? "error"
              : "invalid"
          );
          return;
        }
        setProspect(data.prospect as ResolvedProspect);
        setState("ready");
      } catch (e) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.error("[ACTIVATION_RESOLVE_THREW]", e);
          setReason("client_exception");
          setState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);


  async function handleActivate() {
    if (!prospect) return;
    setPaying(true);
    setPayError(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-activation-checkout", {
        body: {
          activation_token: token,
          email: prospect.email ?? undefined,
          source: "sms_activation",
        },
      });
      if (error || !data?.url) {
        setPayError("Paiement indisponible pour l'instant. Réessayez dans quelques secondes.");
        return;
      }
      redirectToCheckout(data.url as string);
    } catch {
      setPayError("Paiement indisponible pour l'instant. Réessayez dans quelques secondes.");
    } finally {
      setPaying(false);
    }
  }

  const company = prospect?.business_name?.trim() || "votre entreprise";
  const cityLine = prospect?.city ? ` · ${prospect.city}` : "";

  return (
    <div className="alex-immersive min-h-screen bg-[#050816] px-5 py-10 text-readable">
      <Helmet>
        <title>Activer votre profil UNPRO — 1 $</title>
        <meta name="description" content="Activez le profil UNPRO de votre entreprise pour 1 $ et devenez visible auprès des propriétaires et des IA." />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="mx-auto w-full max-w-lg">
        {state === "loading" && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur">
            <Loader2 className="mx-auto mb-5 h-9 w-9 animate-spin text-sky-400" />
            <p className="text-white/70 text-sm">Préparation de votre profil…</p>
          </div>
        )}

        {state === "invalid" && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur">
            <h1 className="mb-3 text-2xl font-semibold text-white">Ce lien d'activation n'est plus valide</h1>
            <p className="mb-6 text-sm text-white/70">
              Le lien a peut-être été tronqué par votre application de messagerie. Vous pouvez activer votre profil directement.
            </p>
            <Link
              to="/pro/activate"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-[#050816]"
            >
              Activer mon profil <ArrowRight className="h-4 w-4" />
            </Link>
            {reason && <p className="mt-4 text-[11px] text-white/40">Réf. : {reason}</p>}
          </div>
        )}

        {state === "error" && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur">
            <h1 className="mb-3 text-2xl font-semibold text-white">Un instant</h1>
            <p className="mb-6 text-sm text-white/70">
              Nous n'arrivons pas à charger votre profil pour le moment. Rafraîchissez la page dans quelques secondes.
            </p>
            <Button onClick={() => window.location.reload()} className="rounded-2xl bg-white text-[#050816] hover:bg-white/90">
              Réessayer
            </Button>
            {reason && <p className="mt-4 text-[11px] text-white/40">Réf. : {reason}</p>}
          </div>
        )}

        {state === "ready" && prospect && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-white/80">
              <Sparkles className="h-3 w-3" /> Offre d'activation
            </div>

            <h1 className="mt-3 text-3xl font-semibold leading-tight text-white">
              {company}
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Profil préparé par UNPRO{cityLine}
            </p>

            <p className="mt-5 text-[15px] leading-relaxed text-white/80">
              Activez votre visibilité auprès des propriétaires et des IA pendant 7 jours.
              Paiement unique de 1 $, sans engagement.
            </p>

            <ul className="mt-5 space-y-2">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[14px] text-white/85">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/20">
                    <Check className="h-2.5 w-2.5 text-emerald-300" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-white">1 $</span>
              <span className="text-sm text-white/60">pour 7 jours</span>
            </div>

            <Button
              onClick={handleActivate}
              disabled={paying}
              className="mt-4 h-14 w-full rounded-2xl bg-white text-base font-semibold text-[#050816] hover:bg-white/90"
            >
              {paying ? "Préparation du paiement…" : (<>Activer mon profil — 1 $ <ArrowRight className="ml-1 h-4 w-4" /></>)}
            </Button>

            {payError && <p className="mt-3 text-xs text-rose-300">{payError}</p>}

            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-white/50">
              <ShieldCheck className="h-3 w-3" />
              Paiement sécurisé Stripe · Aucun renouvellement automatique
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
