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

            {/* ---- MOBILE-FIRST : titre, résumé compact, CTA UNIQUE.
                 Tout le reste (score, avis, faits) est une PREUVE, placée
                 sous le CTA. Aucune donnée inventée. */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/12 px-2.5 py-1 text-[10px] uppercase tracking-wider text-emerald-200">
                <Building2 className="h-3 w-3" /> Profil déjà préparé par UNPRO
              </div>

              <h1 className="text-[27px] font-semibold leading-[1.15] tracking-[-0.03em] text-white sm:text-4xl">
                Activez le profil de <span className="text-sky-300">{company}</span>
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  profile?.trade ?? prospect.category,
                  region ?? profile?.city ?? prospect.city,
                  sourceLabel,
                ]
                  .filter(Boolean)
                  .map((chip) => (
                    <span
                      key={String(chip)}
                      className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[12px] text-white/80"
                    >
                      {chip}
                    </span>
                  ))}
              </div>

              {offer?.label && (
                <p className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-3.5 text-[13.5px] leading-relaxed text-emerald-100">
                  {offer.label}
                </p>
              )}

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

            {/* CTA UNIQUE — l'activation se termine ici, sans quitter la page. */}
            {token && (
              <div ref={offerRef}>
                <ActivationClaimPanel
                  token={token}
                  prospectId={prospect.id ?? null}
                  company={company}
                  maskedContact={contact?.masked ?? null}
                  preview={preview}
                />
              </div>
            )}

            {/* ---- PREUVES (sous le CTA) : le score gratuit et les faits réels. */}
            {profile && <ReadinessMeter profile={profile} onCorrect={handleCorrect} tone="activation" />}
            {profile && <ReviewSignalCard profile={profile} />}
            {profile && <FactGrid facts={profile.facts} />}

            {correctionSent && (
              <div className="rounded-2xl border border-sky-300/25 bg-sky-400/10 p-4 text-[13px] leading-relaxed text-sky-100">
                Parfait. Dès l'activation, Clara vous guide pour corriger et compléter chaque information en
                quelques secondes.
              </div>
            )}

            {/* Aucun CTA secondaire : une seule action possible sur cette page. */}
            <ul className="space-y-1.5 pb-2">
              {BENEFITS.map((b) => (
                <li key={b} className="text-[12.5px] leading-snug text-white/60">• {b}</li>
              ))}
            </ul>
          </div>
        )}
      </div>


    </div>
  );
}
