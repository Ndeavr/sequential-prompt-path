/**
 * UNPRO — Offre personnalisée affichée APRÈS le score IA, AVANT tout paiement.
 *
 * Règles :
 * - aucun prix inventé : les montants viennent du catalogue canonique
 *   (`src/config/contractorPlans.ts`, miroir de public.plans) ;
 * - la garantie est toujours annuelle (`buildAppointmentGuarantee`) ;
 * - l'entrepreneur voit son score, sa recommandation, son forfait, son prix et
 *   ce qu'il obtient AVANT d'être envoyé vers Stripe.
 */
import { useMemo, useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { redirectToCheckout } from "@/lib/redirectToCheckout";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import {
  PUBLIC_CONTRACTOR_PLANS,
  formatPrice,
  getRecommendedPlanSlug,
  type ContractorPlan,
  type ContractorPlanSlug,
} from "@/config/pricing";
import { buildAppointmentGuarantee } from "@/lib/pricing/appointmentGuarantee";

export interface AuditOfferAttribution {
  ref?: string | null;
  prospectId?: string | null;
  campaign?: string | null;
  source?: string | null;
  activationToken?: string | null;
}

interface Props {
  auditId: string;
  /** Jeton de l'audit — transmis au devis pour éviter toute re-saisie. */
  auditToken?: string | null;
  /** Devis personnalisé déjà calculé, s'il existe. */
  quoteId?: string | null;
  score: number;
  businessName: string | null;
  city: string | null;
  trade: string | null;
  attribution?: AuditOfferAttribution;
  /** Chemin de retour si l'entrepreneur annule le paiement. */
  returnPath: string;
}

/** Forfaits payants réellement souscriptibles, du plus petit au plus grand. */
const PAID_PLANS: ContractorPlan[] = PUBLIC_CONTRACTOR_PLANS.filter((p) => !p.free);

/**
 * Recommandation déterministe à partir du score réel : plus la visibilité IA
 * est faible, plus il faut de rendez-vous pour compenser dès maintenant.
 * Aucune donnée d'entreprise n'est inventée.
 */
export function recommendPlanFromScore(score: number): ContractorPlanSlug {
  if (!Number.isFinite(score)) return getRecommendedPlanSlug();
  if (score < 35) return "croissance_v2";
  if (score < 70) return getRecommendedPlanSlug(); // pro_v2
  return "depart";
}

export function recommendationReason(score: number, city: string | null): string {
  const where = city ? `à ${city}` : "dans votre secteur";
  if (score < 35) {
    return `Votre score de ${score} / 100 signifie que l'IA vous comprend mal : vous êtes rarement proposé ${where}. Un flux régulier de rendez-vous exclusifs compense cette invisibilité pendant que votre profil se corrige.`;
  }
  if (score < 70) {
    return `Avec ${score} / 100, l'IA vous connaît partiellement : vous apparaissez parfois, mais pas en premier ${where}. Le volume de rendez-vous exclusifs vous remet devant les projets pendant la correction.`;
  }
  return `Avec ${score} / 100, votre présence est déjà solide ${where}. Un volume d'entrée suffit pour convertir cette visibilité en rendez-vous exclusifs.`;
}

export function AuditPersonalizedOfferCard({
  auditId,
  auditToken,
  quoteId,
  score,
  businessName,
  city,
  trade,
  attribution,
  returnPath,
}: Props) {
  const [selected, setSelected] = useState<ContractorPlanSlug>(() => recommendPlanFromScore(score));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = useMemo(
    () => PAID_PLANS.find((p) => p.slug === selected) ?? PAID_PLANS[0],
    [selected],
  );
  const guarantee = useMemo(
    () => buildAppointmentGuarantee(plan.appointmentsIncluded),
    [plan.appointmentsIncluded],
  );
  const yearlySavings = Math.max(0, plan.monthlyPrice * 12 - plan.yearlyPrice);

  const startCheckout = async () => {
    setLoading(true);
    setError(null);
    void logFunnelEvent({
      event_type: "plan_selected",
      metadata: { audit_id: auditId, plan_id: plan.slug, score, surface: "audit_ia" },
    });
        try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        window.location.assign(`/auth?next=${encodeURIComponent(returnPath)}`);
        return;
      }
      // Le serveur exige un devis personnalisé persistant avant tout abonnement.
      // Sans devis, on ouvre l'étape canonique de confirmation de capacité :
      // l'entrepreneur y confirme ses chiffres réels, puis paie au prix exact.
      if (!quoteId) {
        const params = new URLSearchParams();
        params.set("audit", auditId);
        if (auditToken) params.set("audit_token", auditToken);
        if (businessName) params.set("entreprise", businessName);
        if (city) params.set("ville", city);
        if (trade) params.set("metier", trade);
        params.set("plan", plan.slug);
        params.set("from", "audit_ia");
        if (attribution?.ref) params.set("ref", attribution.ref);
        if (attribution?.activationToken) params.set("t", attribution.activationToken);
        if (attribution?.prospectId) params.set("prospect", attribution.prospectId);
        if (attribution?.campaign) params.set("utm_campaign", attribution.campaign);
        if (attribution?.source) params.set("utm_source", attribution.source);
        window.location.assign(`/entrepreneur/devis-personnalise?${params.toString()}`);
        return;
      }

      const origin = window.location.origin;
      const { data, error: fnError } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          planId: plan.slug,
          billingInterval: "month",
          quoteId,
          auditId,
          ...(attribution?.ref && { ref: attribution.ref }),
          ...(attribution?.activationToken && { activationToken: attribution.activationToken }),
          ...(attribution?.campaign && { campaign: attribution.campaign }),
          ...(attribution?.source && { source: attribution.source }),
          successUrl: `${origin}/pro/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${origin}${returnPath}${returnPath.includes("?") ? "&" : "?"}checkout=canceled`,
        },
      });
      if (fnError) throw fnError;
      const payload = data as { url?: string; error?: string } | null;
      if (payload?.error) throw new Error(payload.error);
      if (!payload?.url) throw new Error("url_manquante");
      redirectToCheckout(payload.url);
      window.setTimeout(() => setLoading(false), 2500);
    } catch (e) {
      void logFunnelEvent({
        event_type: "dropoff",
        metadata: {
          audit_id: auditId,
          plan_id: plan.slug,
          surface: "audit_ia",
          reason: e instanceof Error ? e.message : String(e),
        },
      });
      setError("Le paiement n'a pas pu démarrer. Vos informations sont conservées, vous pouvez réessayer.");
      setLoading(false);
    }
  };

  return (
    <section
      data-testid="audit-personalized-offer"
      aria-labelledby="audit-offer-title"
      className="rounded-[24px] border border-border bg-card p-5 shadow-sm sm:p-7"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
        Votre offre personnalisée
      </p>
      <h3 id="audit-offer-title" className="mt-2 text-[22px] font-bold leading-tight text-foreground sm:text-[26px]">
        {businessName ? `${businessName} — ` : ""}score IA {score} / 100
      </h3>
      <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
        {recommendationReason(score, city)}
      </p>
      {trade && (
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Métier retenu : {trade} <span className="font-semibold uppercase tracking-wide">· Déclaré</span>
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Choisir un forfait">
        {PAID_PLANS.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => setSelected(p.slug)}
            aria-pressed={p.slug === plan.slug}
            className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
              p.slug === plan.slug
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/50"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-secondary/40 p-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[28px] font-bold tabular-nums text-foreground">
            {formatPrice(plan.monthlyPrice)}
          </span>
          <span className="text-[14px] text-muted-foreground">par mois, taxes en sus</span>
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Ou {formatPrice(plan.yearlyPrice)} par année — vous économisez {formatPrice(yearlySavings)}.
        </p>

        <p className="mt-3 text-[15px] font-semibold text-foreground" data-testid="audit-offer-guarantee">
          {guarantee.guaranteeLabel}
        </p>
        <p className="text-[13px] text-muted-foreground">{guarantee.cadenceLabel}</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
          {guarantee.seasonalityNote}
        </p>

        <ul className="mt-4 space-y-1.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[13.5px] text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-[13px] text-destructive">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        data-testid="audit-offer-cta"
        className="gold-btn mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-bold disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Ouverture du paiement…
          </>
        ) : (
          <>
            Activer mon plan — {formatPrice(plan.monthlyPrice)}/mois <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
      <p className="mt-3 text-[12.5px] text-muted-foreground">
        Prochaine étape : confirmation de votre capacité réelle (moins d'une minute), puis paiement
        sécurisé au prix exact de votre plan.
      </p>
      <p className="mt-2 text-[12.5px] text-muted-foreground">
        Rendez-vous exclusifs, jamais partagés avec un autre entrepreneur. Annulable selon les
        conditions de votre entente.
      </p>
    </section>
  );
}

export default AuditPersonalizedOfferCard;
