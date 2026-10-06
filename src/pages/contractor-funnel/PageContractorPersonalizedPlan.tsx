/**
 * UNPRO — Personalized Pricing Plan
 * Route: /entrepreneur/plan-personnalise/:quoteId
 * Mobile-first cinematic dark glassmorphism. Outcome-first copy.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  TrendingUp,
  MapPin,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  fetchPricingQuote,
  formatCAD,
  formatCADFromDollars,
  type PricingQuote,
} from "@/services/contractorPricingQuoteService";
import { supabase } from "@/integrations/supabase/client";
import { redirectToCheckout } from "@/lib/redirectToCheckout";
import { setActiveQuoteId } from "@/lib/checkoutUrl";
import { buildCommercialLines } from "@/lib/pricing/priceBreakdown";
import { buildAppointmentGuarantee } from "@/lib/pricing/appointmentGuarantee";

import { trackFunnelStep, trackFunnelFailure } from "@/lib/analytics/funnelSteps";
import { FallbackCredit350Card } from "@/components/entrepreneur/FallbackCredit350Card";
import {
  CONTRACTOR_OBJECTIVE_CTA,
  isContractorObjective,
} from "@/lib/routing/contractorPlanRoute";
import { toast } from "sonner";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

const PLAN_LABEL: Record<string, string> = {
  presence: "Présence",
  depart: "Départ",
  croissance_v2: "Croissance",
  pro_v2: "Pro",
  elite_v2: "Élite",
  signature_v2: "Signature",
  // superseded codes still returned by older quotes
  local: "Départ",
  croissance: "Croissance",
  pro: "Pro",
  premium: "Élite",
  domination: "Signature",
  recrue: "Présence",
  elite: "Élite",
  signature: "Signature",
};

/** État EXACT de l'offre affilié, validé côté serveur. Jamais dérivé de l'URL. */
interface AffiliateOfferState {
  offer_exists: boolean;
  status?: "offered" | "accepted" | "granted" | "consumed" | "expired" | "revoked";
  offered_appointments?: number;
  granted_appointments?: number;
  consumed_appointments?: number;
  remaining_appointments?: number;
  promo_valid: boolean;
  promo_code?: string | null;
  discount_percent?: number | null;
  discount_duration?: string | null;
}

export default function PageContractorPersonalizedPlan() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const [searchParams] = useSearchParams();
  // Offre affilié : code promo personnel (50 % du premier mois payé seulement).
  const promoCode = (searchParams.get("promo") ?? "").trim().toUpperCase() || null;
  const affiliateRef = (searchParams.get("ref") ?? "").trim().toUpperCase() || null;
  const offerId = (searchParams.get("offer") ?? "").trim() || null;
  const activationToken = (searchParams.get("t") ?? "").trim() || null;
  const rawObjective = searchParams.get("objective");
  const objective = isContractorObjective(rawObjective) ? rawObjective : null;
  const ctaOrigin = searchParams.get("from");
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const [quote, setQuote] = useState<PricingQuote | null>(null);
  const [offerState, setOfferState] = useState<AffiliateOfferState | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(true);
  const [fallbackVisible, setFallbackVisible] = useState(false);
  const [fallbackDeclined, setFallbackDeclined] = useState(false);

  // Aucune offre n'est affichée sans preuve serveur : un entrepreneur organique
  // non attribué ne voit jamais l'offre affilié.
  useEffect(() => {
    if (!promoCode && !offerId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("affiliate_offer_public_state" as never, {
        _offer_id: offerId,
        _promo_code: promoCode,
      } as never);
      if (cancelled || error) return;
      setOfferState(data as unknown as AffiliateOfferState);
    })();
    return () => {
      cancelled = true;
    };
  }, [promoCode, offerId]);


  useEffect(() => {
    if (!quoteId) return;
    let cancelled = false;
    (async () => {
      try {
        const q = await fetchPricingQuote(quoteId);
        if (!cancelled) setQuote(q);
      } catch (e) {
        toast.error("Devis introuvable. Recommençons ensemble.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  const waitlisted = quote?.pricing_status === "waitlisted";
  const planLabel = PLAN_LABEL[quote?.recommended_plan ?? ""] ?? "Pro";

  // Taxes du Québec affichées avant paiement : TPS 5 % + TVQ 9,975 %.
  // Les mêmes taux sont appliqués par le serveur sur la page de paiement.
  const baseCents = quote?.recommended_monthly_price ?? 0;
  const gstCents = Math.round(baseCents * 0.05);
  const qstCents = Math.round(baseCents * 0.09975);
  const totalWithTaxCents = baseCents + gstCents + qstCents;

  // Étape « plan présenté » : écrite une seule fois par session et par devis.
  useEffect(() => {
    if (!quote) return;
    void trackFunnelStep("plan_presented", {
      subjectId: quote.id,
      contractorId: quote.contractor_id ?? null,
      city: quote.city ?? null,
      metadata: {
        plan_code: quote.recommended_plan,
        pricing_status: quote.pricing_status,
        monthly_price: quote.recommended_monthly_price,
        objective,
        from: ctaOrigin,
      },
    });
  }, [quote, objective, ctaOrigin]);

  // Retour depuis Stripe : succès ou annulation, jamais deviné.
  const checkoutOutcome = searchParams.get("checkout");
  useEffect(() => {
    if (!quote || !checkoutOutcome) return;
    if (checkoutOutcome === "success") {
      void trackFunnelStep("payment_succeeded", {
        subjectId: quote.id,
        contractorId: quote.contractor_id ?? null,
        metadata: { source: "stripe_return" },
      });
    } else if (checkoutOutcome === "canceled") {
      void trackFunnelFailure("checkout_created", "checkout_canceled_by_user", {
        subjectId: quote.id,
      });
    }
  }, [quote, checkoutOutcome]);

  /* Étape 4 : activation payante affichée SEULEMENT après confirmation serveur
     (webhook Stripe → pricing_status = "paid"). Le retour Stripe seul ne suffit pas. */
  const [paymentConfirm, setPaymentConfirm] = useState<"idle" | "waiting" | "paid" | "timeout">("idle");
  useEffect(() => {
    if (checkoutOutcome !== "success" || !quoteId) return;
    let cancelled = false;
    setPaymentConfirm("waiting");
    void (async () => {
      for (let i = 0; i < 30 && !cancelled; i++) {
        try {
          const q = await fetchPricingQuote(quoteId);
          if (q?.pricing_status === "paid") {
            if (!cancelled) setPaymentConfirm("paid");
            setTimeout(() => { if (!cancelled) navigate("/pro", { replace: true }); }, 6000);
            return;
          }
        } catch { /* on réessaie */ }
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!cancelled) setPaymentConfirm("timeout");
    })();
    return () => { cancelled = true; };
  }, [checkoutOutcome, quoteId, navigate]);

  const handleActivate = async () => {
    if (!quote) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      // Un entrepreneur arrivé par SMS n'a pas encore de compte : on l'amène
      // se connecter et il revient exactement sur son plan, sans rien reperdre.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setActiveQuoteId(quote.id);
        const next = `${window.location.pathname}${window.location.search}`;
        setCheckoutLoading(false);
        navigate(`/auth?next=${encodeURIComponent(next)}`);
        return;
      }
      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            planId: quote.recommended_plan,
            billingInterval: "month",
            quoteId: quote.id,
            // Le montant affiché est transmis pour contrôle : le serveur refuse
            // la transaction si elle ne correspond pas au devis, au cent près.
            displayedPriceCents: quote.recommended_monthly_price,
            ...(promoCode && { promoCode }),
            ...(affiliateRef && { ref: affiliateRef }),
            ...(offerId && { offerId }),
            ...(activationToken && { activationToken }),
            successUrl: `${window.location.origin}/entrepreneur/plan-personnalise/${quote.id}?checkout=success`,
            cancelUrl: `${window.location.origin}/entrepreneur/plan-personnalise/${quote.id}?checkout=canceled`,
          },
        },
      );
      if (error) throw error;
      const payload = data as { url?: string; sessionId?: string; error?: string } | null;
      if (payload?.error) throw new Error(payload.error);
      const url = payload?.url;
      if (!url) throw new Error("url_manquante");

      await trackFunnelStep("checkout_created", {
        subjectId: quote.id,
        contractorId: quote.contractor_id ?? null,
        metadata: {
          plan_code: quote.recommended_plan,
          stripe_session_id: payload?.sessionId ?? null,
          promo_code: promoCode,
          objective,
          from: ctaOrigin,
        },
      });

      redirectToCheckout(url);
      setTimeout(() => setCheckoutLoading(false), 2500);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      void trackFunnelFailure("checkout_created", reason, { subjectId: quote.id });
      setCheckoutError(
        "Le paiement n'a pas pu démarrer. Réessayez, ou écrivez à Clara pour terminer avec un humain.",
      );
      toast.error("Le paiement n'a pas pu démarrer.");
      setCheckoutLoading(false);
    }
  };

  if (paymentConfirm !== "idle") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white p-6">
        <div className="max-w-md text-center space-y-4" data-testid="payment-confirmation">
          <p className="text-xs uppercase tracking-wider text-white/60">Confirmation</p>
          {paymentConfirm === "waiting" && (
            <>
              <Loader2 className="w-8 h-8 animate-spin mx-auto opacity-70" />
              <h1 className="text-2xl font-semibold">Confirmation du paiement en cours…</h1>
              <p className="text-white/70">Votre entente sera activée dès que le paiement est confirmé.</p>
            </>
          )}
          {paymentConfirm === "paid" && (
            <>
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h1 className="text-2xl font-semibold">Votre entente est activée.</h1>
              <ul className="text-sm text-white/75 space-y-1">
                <li>Compte connecté ✓</li>
                <li>Fiche rattachée{quote?.company_name ? ` : ${quote.company_name}` : ""} ✓</li>
                <li>Forfait {planLabel} activé ✓</li>
              </ul>
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.08] p-3 text-left text-xs text-white/80">
                <p className="font-semibold text-amber-200">Avant de recevoir des mandats</p>
                <p className="mt-1">UNPRO doit encore vérifier votre licence RBQ et votre fiche. Le paiement ne remplace pas cette vérification.</p>
              </div>
              <button onClick={() => navigate("/pro", { replace: true })} className="rounded-full px-6 py-3 bg-amber-500 text-black font-semibold">
                Ouvrir mon espace entrepreneur
              </button>
            </>
          )}
          {paymentConfirm === "timeout" && (
            <>
              <h1 className="text-2xl font-semibold">Paiement reçu, confirmation en attente.</h1>
              <p className="text-white/70">Nous n'avons pas encore la confirmation finale. Votre forfait n'est pas encore affiché comme activé.</p>
              <button onClick={() => window.location.reload()} className="rounded-full px-6 py-3 bg-amber-500 text-black font-semibold">
                Vérifier à nouveau
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white">
        <Loader2 className="w-8 h-8 animate-spin opacity-60" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white p-6 text-center">
        <div>
          <p className="text-lg mb-4">Aucun devis trouvé.</p>
          <button
            onClick={() => navigate("/entrepreneur/devis-personnalise")}
            className="rounded-full px-5 py-3 bg-amber-500 text-black font-semibold"
          >
            Repartir avec Clara
          </button>
        </div>
      </div>
    );
  }

  /**
   * Un plan à 0 $ n'existe pas : quand le budget mensuel choisi ne couvre
   * même pas un rendez-vous exclusif, on le dit clairement au lieu
   * d'afficher un prix faux.
   */
  if (!quote.recommended_monthly_price || quote.recommended_monthly_price <= 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold">Votre budget ne couvre pas encore un rendez-vous exclusif.</h1>
          <p className="text-white/70">
            Chaque rendez-vous UNPRO est exclusif : il n'est jamais partagé. Ajustez votre budget
            mensuel ou le nombre de rendez-vous souhaités, et nous recalculons votre plan.
          </p>
          <button
            onClick={() => navigate("/entrepreneur/devis-personnalise")}
            className="rounded-full px-6 py-3 bg-amber-500 text-black font-semibold"
          >
            Ajuster mon plan
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#050816] text-white relative overflow-hidden pb-8">
      <Helmet>
        <title>Votre plan recommandé · UNPRO</title>
        <meta
          name="description"
          content="Tarification personnalisée selon vos objectifs, votre territoire et votre métier."
        />
      </Helmet>

      {/* Background stack */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto px-5 pt-12">
        {/* En-tête — étape 3 sur 3 */}
        <div className="mb-6">
          <p className="text-sm text-white/60 tracking-wide uppercase" data-testid="plan-step-label">
            Étape 3 sur 3 · Votre entente de départ
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold mt-2 tracking-[-0.04em]">
            Pour commencer{quote.company_name ? `, ${quote.company_name}` : ""}.
          </h1>
        </div>

        {/* Compte déjà actif : aucune nouvelle invitation à payer. */}
        {quote.pricing_status === "paid" && (
          <GlassCard className="p-6 mb-5 border-emerald-400/30" >
            <div data-testid="already-active">
              <p className="text-lg font-semibold">Votre entente est déjà activée.</p>
              <p className="text-sm text-white/70 mt-1">Aucun nouveau paiement n'est requis.</p>
              <button onClick={() => navigate("/pro", { replace: true })} className="mt-4 rounded-full px-5 py-3 bg-amber-500 text-black font-semibold">
                Ouvrir mon espace entrepreneur
              </button>
            </div>
          </GlassCard>
        )}

        {/* Offre affilié — état EXACT vérifié en base. */}
        {offerState && (offerState.promo_valid || (offerState.offer_exists && ["granted", "accepted", "offered"].includes(offerState.status ?? ""))) && (
          <GlassCard className="p-5 mb-5 border-emerald-400/30">
            <div className="flex items-center gap-2 mb-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Offre vérifiée</span>
            </div>
            {offerState.offer_exists && offerState.status === "granted" && (
              <p className="text-sm text-white/80">{offerState.remaining_appointments} rendez-vous offerts disponibles sur {offerState.granted_appointments}.</p>
            )}
            {offerState.offer_exists && (offerState.status === "accepted" || offerState.status === "offered") && (
              <p className="text-sm text-white/80">{offerState.offered_appointments} rendez-vous offerts, accordés à l'activation.</p>
            )}
            {offerState.promo_valid && (
              <p className="mt-1 text-sm text-white/80">
                Code <span className="font-semibold text-white">{offerState.promo_code}</span> : {offerState.discount_percent ?? 50} % sur le premier mois payé, une seule fois.
              </p>
            )}
          </GlassCard>
        )}

        {/* Une seule carte : offre → prestations → conditions → prix → action */}
        {quote.pricing_status !== "paid" && (() => {
          const guarantee = buildAppointmentGuarantee(quote.guaranteed_appointments ?? null);
          const included = quote.guaranteed_appointments ?? quote.target_monthly_appointments;
          return (
            <GlassCard className="p-6 mb-4">
              <div data-testid="starter-offer-card">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs uppercase tracking-wider text-amber-300/80">Offre recommandée pour commencer</span>
                </div>
                <p className="text-2xl font-semibold tracking-[-0.03em]">Forfait {planLabel}</p>
                <p className="text-sm text-white/70 mt-1" data-testid="plan-relevance">
                  Pour atteindre vos objectifs, nous vous recommandons cette entente de départ.
                </p>
                <p className="text-sm text-white/70 mt-1">
                  Elle est conçue pour vous permettre de commencer simplement et d'ajuster ensuite selon vos résultats.
                </p>

                <div className="mt-5 space-y-2 text-sm text-white/85">
                  <p className="text-xs uppercase tracking-wider text-white/50">Ce qui est inclus</p>
                  <p className="flex gap-2" data-testid="included-appointments"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />{guarantee.checkoutPrimaryLabel}</p>
                  <p className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />Rendez-vous exclusifs, jamais partagés avec d'autres entrepreneurs</p>
                  <p className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />Profil public UNPRO pour {quote.trade_primary}</p>
                </div>

                <div className="mt-5 space-y-1 text-xs text-white/60 leading-relaxed">
                  <p className="text-xs uppercase tracking-wider text-white/50">Conditions</p>
                  <p>{guarantee.checkoutSecondaryLabel}</p>
                  <p>Facturation mensuelle, sans engagement annuel. L'engagement de rendez-vous indiqué ci-dessus est calculé sur 12 mois d'abonnement actif; une résiliation avant 12 mois met fin à l'engagement pour les mois non payés.</p>
                  <p>Avant de recevoir des mandats, votre licence RBQ et votre fiche doivent être vérifiées par UNPRO. Le paiement ne remplace pas cette vérification.</p>
                  {waitlisted && <p className="text-amber-200/90">Votre métier est en forte demande dans ce territoire : une place d'attente vous est proposée.</p>}
                </div>

                <div className="mt-6 border-t border-white/10 pt-5" data-testid="price-block">
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-semibold tracking-[-0.04em]" data-testid="plan-price">{formatCAD(quote.recommended_monthly_price)}</div>
                    <div className="text-white/60">/ mois, avant taxes</div>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-white/75" data-testid="tax-breakdown">
                    <div className="flex justify-between"><span>Abonnement mensuel</span><span>{formatCAD(quote.recommended_monthly_price)}</span></div>
                    <div className="flex justify-between"><span>TPS (5 %)</span><span>{formatCAD(gstCents)}</span></div>
                    <div className="flex justify-between"><span>TVQ (9,975 %)</span><span>{formatCAD(qstCents)}</span></div>
                    <div className="flex justify-between border-t border-white/10 pt-1 font-semibold text-white">
                      <span>Total dû aujourd'hui</span><span data-testid="total-with-tax">{formatCAD(totalWithTaxCents)}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/50 mt-2">Aucuns frais d'ouverture. Le même montant, taxes incluses, est facturé chaque mois.</p>
                </div>

                {checkoutError && (
                  <div role="alert" className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">{checkoutError}</div>
                )}
                <button
                  onClick={() => (waitlisted ? navigate("/entrepreneur/devis-personnalise?status=waitlisted") : handleActivate())}
                  disabled={checkoutLoading}
                  data-testid="activate-offer"
                  className="mt-5 w-full h-14 rounded-[18px] bg-amber-500 text-black font-semibold flex items-center justify-center disabled:opacity-60"
                >
                  {checkoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : waitlisted ? "Modifier mes objectifs" : totalWithTaxCents > 0 ? "Continuer vers le paiement" : "Activer mon offre gratuite"}
                </button>
                {checkoutOutcome === "canceled" && (
                  <p className="mt-2 text-xs text-white/60 text-center">Paiement annulé. Votre offre est conservée : vous pouvez reprendre ici.</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const carry = new URLSearchParams(searchParams);
                    carry.delete("checkout");
                    const qs = carry.toString();
                    navigate(`/entrepreneur/devis-personnalise${qs ? `?${qs}` : ""}`);
                  }}
                  className="mt-3 block mx-auto text-xs text-white/55 underline underline-offset-4 hover:text-white"
                >
                  Ajuster mon offre
                </button>
              </div>
            </GlassCard>
          );
        })()}


        {/* Offre de repli — proposée seulement après le forfait, une seule fois. */}
        {!waitlisted && !fallbackDeclined && quote.pricing_status !== "paid" && (
          <div className="mt-8">
            {fallbackVisible ? (
              <FallbackCredit350Card
                quoteId={quote.id}
                contractorId={quote.contractor_id ?? null}
                affiliateRef={affiliateRef ?? null}
                onDecline={() => {
                  setFallbackDeclined(true);
                  void supabase.functions.invoke("contractor-relance-abandon", {
                    body: { action: "fallback_status", quote_id: quote.id, status: "fallback_350_declined" },
                  });
                }}
                returnPath={`/entrepreneur/plan-personnalise/${quote.id}`}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setFallbackVisible(true);
                  void supabase.functions.invoke("contractor-relance-abandon", {
                    body: { action: "fallback_status", quote_id: quote.id, status: "fallback_350_offered" },
                  });
                }}
                className="w-full text-center text-sm text-white/50 underline-offset-4 hover:underline"
              >
                Je ne suis pas prêt à choisir un forfait aujourd'hui
              </button>
            )}
          </div>
        )}

        {fallbackDeclined && (
          <p className="mt-8 text-center text-sm text-white/50">
            C'est noté. Votre dossier est conservé, vous pourrez reprendre quand vous
            serez prêt.
          </p>
        )}

        <div className="text-center text-xs text-white/40 mt-8">
          Devis #{quote.id.slice(0, 8)} · Valide 30 jours.
        </div>
      </div>

      <div className="relative px-5 pb-10 text-center">
        <button
          onClick={() => openAlex("contractor_plan", "user_tapped_plan_clara", "floating")}
          className="text-xs text-white/55 underline underline-offset-4"
        >
          Une question? Parler à Clara
        </button>
      </div>
    </div>
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[28px] bg-white/[0.04] border border-white/10 backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/60">{label}</span>
      <span>{value}</span>
    </div>
  );
}
