/**
 * /unpro/activate/:token — Page d'activation reçue par SMS/courriel.
 *
 * Route publique (aucun garde d'authentification). Résout le jeton d'outreach,
 * affiche le PROFIL D'ENTREPRISE DÉJÀ CONSTRUIT par UNPRO (identité, spécialité,
 * territoire, licence, avis réels, score de recommandation) puis dirige vers le
 * profil et le devis mensuel personnalisé.
 *
 * Règle absolue : aucune donnée inventée. Chaque fait porte sa provenance
 * (Vérifié / Déclaré / Déduit) et les sections vides ne sont pas rendues.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, ShieldCheck, ArrowRight, Check, Globe, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import CompanyIdentityHeader from "@/features/activationProfile/components/CompanyIdentityHeader";
import FactGrid from "@/features/activationProfile/components/FactGrid";
import ReviewSignalCard from "@/features/activationProfile/components/ReviewSignalCard";
import ReadinessMeter from "@/features/activationProfile/components/ReadinessMeter";
import { useActivationTracking } from "@/features/activationProfile/useActivationTracking";
import type { ActivationProfile, ResolvedProspect } from "@/features/activationProfile/types";
import { CONTRACTOR_OFFER } from "@/lib/copy/contractorOffer";
import { buildContractorEntryUrl, CONTRACTOR_ACTIVATION_PATH } from "@/config/contractorFunnel";
import { readAttribution } from "@/config/contractorFunnel";
import { saveRoleIntent } from "@/services/auth/roleIntent";
import { saveAuthIntent } from "@/services/auth/authIntentService";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";

const BENEFITS = [
  "Votre profil publié et optimisé pour les IA et les propriétaires",
  "Recommandations dans votre territoire, sans course aux soumissions",
  "Rendez-vous exclusifs, jamais partagés avec 3 concurrents",
  "Aucun renouvellement automatique",
];

export default function PageUnproActivate() {
  const { token } = useParams<{ token: string }>();
  // QA : ?preview=1 rend la page réelle sans écrire de clic ni d'événement
  // d'entonnoir, afin de ne pas contaminer la cohorte de production.
  const preview = typeof window !== "undefined" && (() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("preview") === "1" || params.get("qa") === "1";
  })();
  const [state, setState] = useState<"loading" | "ready" | "invalid" | "error">("loading");
  const [prospect, setProspect] = useState<ResolvedProspect | null>(null);
  const [profile, setProfile] = useState<ActivationProfile | null>(null);
  const navigate = useNavigate();
  const [reason, setReason] = useState<string | null>(null);
  const [correctionSent, setCorrectionSent] = useState(false);
  // Le CTA collant n'apparaît qu'une fois la valeur gratuite consultée.
  const [showStickyCta, setShowStickyCta] = useState(false);
  const offerRef = useRef<HTMLDivElement | null>(null);
  const engagedRef = useRef(false);


  const track = useActivationTracking(token, preview);

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
          body: { token, preview },
        });
        if (cancelled) return;
        if (error || !data?.ok) {
          const serverReason =
            (data as { reason?: string } | null)?.reason ?? (error ? "network_error" : "unknown");
          console.error("[ACTIVATION_RESOLVE_FAILED]", { reason: serverReason, error });
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
        setProfile((data.profile as ActivationProfile) ?? null);
        setState("ready");
        void logFunnelEvent({
          event_type: "activation_page_viewed",
          step: "company_value",
          metadata: { prospect_id: data.prospect?.id ?? null },
          is_test: preview,
        });
      } catch (e) {
        if (!cancelled) {
          console.error("[ACTIVATION_RESOLVE_THREW]", e);
          setReason("client_exception");
          setState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, preview]);

  // landing_engaged: le prospect a réellement consulté son profil (scroll ou 6 s).
  useEffect(() => {
    if (state !== "ready") return;
    const markEngaged = () => {
      if (engagedRef.current) return;
      engagedRef.current = true;
      track("landing_engaged", { readiness: profile?.readiness.score ?? null });
    };
    const onScroll = () => {
      if (window.scrollY > 120) markEngaged();
      const top = offerRef.current?.getBoundingClientRect().top;
      setShowStickyCta(typeof top === "number" && top < window.innerHeight * 0.9);
    };
    const timer = window.setTimeout(markEngaged, 6000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [state, track, profile]);

  const handleCorrect = useCallback(() => {
    track("correction_requested", { readiness: profile?.readiness.score ?? null });
    setCorrectionSent(true);
  }, [track, profile]);

  /**
   * Preserve the outreach token while moving into the canonical value-first flow.
   */
  async function handleActivate(placement: string) {
    if (!prospect) return;
    track("profile_continue_clicked", { placement });
    handleCustomize();
  }

  /** Action secondaire : calculer une garantie personnalisée (jeton conservé). */
  function handleCustomize() {
    const attribution = readAttribution();
    const params = new URLSearchParams(attribution);
    if (token) params.set("t", token);
    const trade = profile?.trade ?? prospect?.category ?? "";
    const city = profile?.city ?? prospect?.city ?? "";
    if (trade) params.set("trade", trade);
    if (city) params.set("city", city);
    if (prospect?.id) params.set("prospect_id", prospect.id);
    if (company) params.set("entreprise", company);
    if (trade) params.set("metier", trade);
    if (city) params.set("ville", city);
    params.set("step", "profile");
    const returnPath = `${CONTRACTOR_ACTIVATION_PATH}?${params.toString()}`;
    saveRoleIntent("contractor", {
      returnPath,
      token,
      prospectId: prospect?.id,
      affiliateRef: attribution.aff ?? attribution.affiliate ?? attribution.ref,
      campaignId: attribution.campaign_id ?? attribution.campaign ?? attribution.utm_campaign,
      onboardingStep: "profile",
      businessName: company,
      city,
      trade,
      attribution,
    });
    saveAuthIntent({ returnPath, action: "contractor_activation", roleHint: "contractor", metadata: attribution });
    void logFunnelEvent({
      event_type: "activation_cta_clicked",
      step: "profile_activation",
      metadata: { prospect_id: prospect?.id ?? null },
      is_test: preview,
    });
    navigate(buildContractorEntryUrl(Object.fromEntries(params), CONTRACTOR_ACTIVATION_PATH));
  }


  const company = profile?.display_name ?? prospect?.business_name?.trim() ?? "votre entreprise";
  const canceled =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("canceled") === "1";


  return (
    <div className="alex-immersive min-h-screen bg-[#050816] px-5 pb-28 pt-10 text-readable sm:pb-14">
      <Helmet>
        <title>{`${company} — Activer votre profil UNPRO`}</title>
        <meta
          name="description"
          content="Votre profil d'entreprise est déjà préparé par UNPRO. Vérifiez-le, précisez vos objectifs et recevez votre devis personnalisé."
        />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="mx-auto w-full max-w-lg">
        {state === "loading" && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur">
            <Loader2 className="mx-auto mb-5 h-9 w-9 animate-spin text-sky-400" />
            <p className="text-sm text-white/70">Préparation de votre profil…</p>
          </div>
        )}

        {state === "invalid" && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur">
            <h1 className="mb-3 text-2xl font-semibold text-white">Ce lien d'activation n'est plus valide</h1>
            <p className="mb-6 text-sm text-white/70">
              Le lien a peut-être été tronqué par votre application de messagerie. Vous pouvez activer votre
              profil directement.
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
              Nous n'arrivons pas à charger votre profil pour le moment. Rafraîchissez la page dans quelques
              secondes.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="rounded-2xl bg-white text-[#050816] hover:bg-white/90"
            >
              Réessayer
            </Button>
            {reason && <p className="mt-4 text-[11px] text-white/40">Réf. : {reason}</p>}
          </div>
        )}

        {state === "ready" && prospect && (
          <div className="space-y-4">
            {canceled && (
              <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 text-[13px] leading-relaxed text-amber-100">
                Paiement interrompu. Votre profil est toujours réservé — vous pouvez reprendre ci-dessous.
              </div>
            )}

            {/* ---- AU-DESSUS DE LA LIGNE DE FLOTTAISON : la valeur gratuite d'abord.
                 On ne demande jamais d'argent avant d'avoir montré ce qu'UNPRO
                 sait déjà de l'entreprise (données réelles uniquement). */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/12 px-2.5 py-1 text-[10px] uppercase tracking-wider text-emerald-200">
                <Building2 className="h-3 w-3" /> Profil déjà préparé par UNPRO
              </div>

              {profile ? (
                <CompanyIdentityHeader profile={profile} />
              ) : (
                <h1 className="text-3xl font-semibold leading-tight text-white">{company}</h1>
              )}

              <p className="mt-4 text-[15px] leading-relaxed text-white/85">
                Curieux de savoir si votre entreprise est recommandée par l'IA&nbsp;? Voici gratuitement
                le profil et le score que nous avons déjà constitués pour {company}.
              </p>

              {profile?.website_host && (
                <a
                  href={profile.website_url ?? undefined}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={() => track("profile_section_expanded", { section: "website" })}
                  className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-sky-300 underline underline-offset-4"
                >
                  <Globe className="h-3.5 w-3.5" /> {profile.website_host}
                </a>
              )}
            </div>

            {/* Le score gratuit : la preuve avant la demande. */}
            {profile && <ReadinessMeter profile={profile} onCorrect={handleCorrect} tone="activation" />}
            {profile && <ReviewSignalCard profile={profile} />}
            {profile && <FactGrid facts={profile.facts} />}

            {correctionSent && (
              <div className="rounded-2xl border border-sky-300/25 bg-sky-400/10 p-4 text-[13px] leading-relaxed text-sky-100">
                Parfait. Dès l'activation, Clara vous guide pour corriger et compléter chaque information en
                quelques secondes.
              </div>
            )}

            {/* ------------------------------- ENSUITE seulement : l'offre + le CTA */}
            <div ref={offerRef} className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur">
              <p className="text-[15px] leading-relaxed text-white/85">
                Vérifiez les informations de votre profil, puis indiquez vos objectifs pour recevoir votre plan personnalisé.
              </p>

              <ul className="mt-4 space-y-2">
                {["Profil à vérifier et compléter", "Objectifs et capacité pris en compte", "Devis mensuel calculé côté serveur"].map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[14px] leading-snug text-white/85">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/20">
                      <Check className="h-2.5 w-2.5 text-emerald-300" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12.5px] leading-relaxed text-white/55">Aucun paiement avant l'affichage de votre devis.</p>

              <Button
                onClick={() => handleActivate("offer")}
                className="mt-5 h-14 w-full rounded-2xl bg-white text-base font-semibold text-[#050816] hover:bg-white/90"
              >
                <>{CONTRACTOR_OFFER.ctaClaim} <ArrowRight className="ml-1 h-4 w-4" /></>
              </Button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/50">
                <ShieldCheck className="h-3 w-3" />
                Analyse et vérification gratuites avant le devis.
              </p>

              <ul className="mt-4 space-y-1.5">
                {BENEFITS.map((b) => (
                  <li key={b} className="text-[12.5px] leading-snug text-white/60">• {b}</li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={handleCustomize}
              className="mx-auto block pb-2 text-center text-xs text-white/50 underline underline-offset-4 hover:text-white/75"
            >
              {CONTRACTOR_OFFER.ctaPrimary}
            </button>
          </div>
        )}
      </div>

      {/* CTA collant mobile : n'apparaît qu'après la valeur gratuite (score + profil). */}
      {state === "ready" && prospect && showStickyCta && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050816]/95 px-5 py-3 backdrop-blur sm:hidden">
          <Button
            onClick={() => handleActivate("sticky_mobile")}
            className="h-13 w-full rounded-2xl bg-white py-3.5 text-base font-semibold text-[#050816] hover:bg-white/90"
          >
            {CONTRACTOR_OFFER.ctaClaim}
          </Button>

        </div>
      )}

    </div>
  );
}
