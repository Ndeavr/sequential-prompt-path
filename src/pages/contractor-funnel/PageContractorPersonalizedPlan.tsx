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
import { buildCommercialLines } from "@/lib/pricing/priceBreakdown";
import { trackFunnelStep, trackFunnelFailure } from "@/lib/analytics/funnelSteps";
import {
  CONTRACTOR_OBJECTIVE_CTA,
  isContractorObjective,
} from "@/lib/routing/contractorPlanRoute";
import { toast } from "sonner";

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
  const [quote, setQuote] = useState<PricingQuote | null>(null);
  const [offerState, setOfferState] = useState<AffiliateOfferState | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

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

  const handleActivate = async () => {
    if (!quote) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
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
            onClick={() => navigate("/entrepreneur/onboarding")}
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
    <div className="min-h-screen bg-[#050816] text-white relative overflow-hidden pb-32">
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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <p className="text-sm text-white/60 tracking-wide uppercase">
            Tarification personnalisée
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold mt-2 tracking-[-0.04em]">
            {quote.company_name
              ? `Bonjour ${quote.company_name}.`
              : "Voici votre plan."}
            <br />
            <span className="text-white/80">Votre plan recommandé.</span>
          </h1>
          {objective && (
            <p className="mt-3 inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-white/75">
              Objectif : {CONTRACTOR_OBJECTIVE_CTA[objective]}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              const carry = new URLSearchParams(searchParams);
              const qs = carry.toString();
              navigate(`/entrepreneur/devis-personnalise${qs ? `?${qs}` : ""}`);
            }}
            className="mt-3 block text-xs text-white/60 underline underline-offset-4 hover:text-white"
          >
            Modifier mes préférences avant de payer
          </button>
        </motion.div>

        {/* Offre affilié — état EXACT vérifié en base. Aucune promesse non prouvée. */}
        {offerState && (offerState.promo_valid || offerState.offer_exists) && (
          <GlassCard className="p-5 mb-5 border-emerald-400/30">
            <div className="flex items-center gap-2 mb-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">
                Offre vérifiée
              </span>
            </div>
            {offerState.offer_exists && offerState.status === "granted" && (
              <p className="text-sm text-white/80">
                {offerState.remaining_appointments} rendez-vous qualifiés offerts
                disponibles sur {offerState.granted_appointments} accordés.
              </p>
            )}
            {offerState.offer_exists && offerState.status === "accepted" && (
              <p className="text-sm text-white/80">
                Offre acceptée : {offerState.offered_appointments} rendez-vous
                qualifiés seront accordés dès l'activation de votre profil.
              </p>
            )}
            {offerState.offer_exists && offerState.status === "offered" && (
              <p className="text-sm text-white/80">
                {offerState.offered_appointments} rendez-vous qualifiés vous sont
                proposés. Ils sont accordés une fois votre profil activé.
              </p>
            )}
            {offerState.offer_exists && offerState.status === "consumed" && (
              <p className="text-sm text-white/80">
                Vos {offerState.consumed_appointments} rendez-vous offerts ont été
                utilisés.
              </p>
            )}
            {offerState.offer_exists &&
              (offerState.status === "expired" || offerState.status === "revoked") && (
                <p className="text-sm text-white/70">
                  Cette offre de rendez-vous n'est plus active.
                </p>
              )}
            {offerState.promo_valid && (
              <p className="mt-2 text-sm text-white/80">
                Code{" "}
                <span className="font-semibold text-white">
                  {offerState.promo_code}
                </span>{" "}
                : {offerState.discount_percent ?? 50} % sur le premier mois payé —
                une seule fois.
              </p>
            )}
          </GlassCard>
        )}


        {/* Hero plan card */}

        <GlassCard className="p-7 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs uppercase tracking-wider text-amber-300/80">
              Plan {planLabel} · {quote.city} · {quote.trade_primary}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-5xl font-semibold tracking-[-0.04em]">
              {formatCAD(quote.recommended_monthly_price)}
            </div>
            <div className="text-white/60">/ mois</div>
          </div>
          <p className="text-white/70 mt-3 text-sm">
            Calibré sur vos objectifs réels, votre capacité et la demande dans
            votre territoire.
          </p>
        </GlassCard>

        {/* Potential revenue */}
        <GlassCard className="p-6 mb-5">
          <div className="flex items-center gap-2 mb-2 text-cyan-300">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">
              Potentiel mensuel estimé
            </span>
          </div>
          <div className="text-3xl font-semibold tracking-[-0.03em]">
            {formatCADFromDollars(quote.estimated_monthly_revenue_potential)}
          </div>
          <p className="text-sm text-white/60 mt-2">
            ROI estimé{" "}
            <span className="text-white font-medium">
              ×{Math.max(1, Math.round(quote.roi_estimate))}
            </span>{" "}
            sur la base de {quote.target_monthly_appointments} rendez-vous /
            mois × {Math.round(quote.estimated_close_rate * 100)} % de fermeture
            × {formatCADFromDollars(quote.average_project_value)}.
          </p>
        </GlassCard>

        {/* Territory */}
        <GlassCard className="p-5 mb-5 flex items-start gap-3">
          <MapPin
            className={`w-5 h-5 mt-0.5 ${
              waitlisted ? "text-amber-400" : "text-emerald-400"
            }`}
          />
          <div>
            <div className="text-sm font-semibold">
              {waitlisted
                ? "Territoire en forte demande"
                : "Territoire disponible"}
            </div>
            <div className="text-xs text-white/60 mt-1">
              {waitlisted
                ? "Un plan d'attente vous est proposé. Réservez votre place avant qu'un slot ne s'ouvre."
                : "Une place est disponible pour votre métier dans cette zone."}
            </div>
          </div>
        </GlassCard>

        {/* Guarantees */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {[
            "Rendez-vous garantis",
            "Pas de leads partagés",
            "RBQ vérifié",
            "Sans engagement annuel",
          ].map((g) => (
            <div
              key={g}
              className="flex items-center gap-2 text-xs text-white/80 bg-white/[0.04] border border-white/10 rounded-2xl px-3 py-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {g}
            </div>
          ))}
        </div>

        {/* Détail commercial — uniquement ce qui est compréhensible */}
        <GlassCard className="p-0 mb-6 overflow-hidden">
          <button
            onClick={() => setBreakdownOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="w-4 h-4 text-white/60" />
              Ce qui est inclus dans votre plan
            </div>
            <ChevronDown
              className={`w-4 h-4 text-white/60 transition-transform ${
                breakdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {breakdownOpen && (() => {
            const summary = buildCommercialLines(quote as never, {
              trade: quote.trade_primary,
              city: quote.city,
              plan_label: planLabel,
              monthly_budget_cents: quote.monthly_budget ?? null,
              guaranteed_appointments: quote.guaranteed_appointments ?? null,
            });
            return (
              <div className="px-5 pb-5 text-sm text-white/80 space-y-1.5 border-t border-white/5">
                {summary.budget_note && (
                  <p className="pt-3 text-[13px] text-cyan-200/90">{summary.budget_note}</p>
                )}
                {summary.lines.map((line, i) => (
                  <div key={i} className="pt-1">
                    <Row label={line.label} value={formatCAD(line.cents)} />
                    {line.sublabel && (
                      <p className="text-[11px] text-white/45 -mt-0.5">{line.sublabel}</p>
                    )}
                  </div>
                ))}
                <div className="border-t border-white/10 mt-3 pt-3 flex justify-between font-semibold">
                  <span>Total mensuel</span>
                  <span>{formatCAD(summary.total_cents)}</span>
                </div>
                {summary.appointments_unavailable && (
                  <p className="pt-2 text-[11px] text-white/45">
                    Aucun volume de rendez-vous n'est vendu tant que nous n'avons pas de référence
                    fiable pour votre métier dans ce marché.
                  </p>
                )}
                <p className="pt-2 text-[11px] text-white/45">
                  C'est exactement le montant facturé au paiement. Aucun frais additionnel.
                </p>
              </div>
            );
          })()}
        </GlassCard>


        <div className="text-center text-xs text-white/40 mt-8">
          Devis #{quote.id.slice(0, 8)} · Valide 30 jours.
        </div>
      </div>

      {/* Sticky footer CTA */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-gradient-to-t from-[#050816] via-[#050816]/95 to-transparent pt-6 pb-5 px-5">
        {checkoutError && (
          <div
            role="alert"
            className="max-w-2xl mx-auto mb-3 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          >
            {checkoutError}
          </div>
        )}
        <div className="max-w-2xl mx-auto flex gap-2">
          {waitlisted ? (
            <button
              onClick={() => navigate("/entrepreneur/devis-personnalise?status=waitlisted")}
              disabled={checkoutLoading}
              className="flex-1 h-14 rounded-[18px] bg-amber-500 text-black font-semibold flex items-center justify-center disabled:opacity-60"
            >
              {checkoutLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Modifier mes objectifs"
              )}
            </button>
          ) : (
            <button
              onClick={() => handleActivate()}
              disabled={checkoutLoading}
              className="flex-1 h-14 rounded-[18px] bg-amber-500 text-black font-semibold flex items-center justify-center disabled:opacity-60 shadow-[0_10px_30px_-10px_rgba(251,191,36,0.6)]"
            >
              {checkoutLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Activer mes rendez-vous"
              )}
            </button>
          )}
          <button
            onClick={() => navigate("/entrepreneur/onboarding?focus=alex")}
            className="h-14 px-4 rounded-[18px] bg-white/[0.06] border border-white/10 text-white text-sm"
          >
            Parler à Clara
          </button>
        </div>
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
