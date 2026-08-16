/**
 * UNPRO — Politique d'utilisation raisonnable (garde-fou quotidien invisible).
 * Source unique côté client. Miroir : supabase/functions/_shared/usagePolicyCopy.ts
 *
 * Règle : aucun message technique ("rate limit", "quota API", "3/jour").
 */
export type DailyGuardFeature = "quote_analysis_monthly" | "ai_design_monthly";

export interface DailyLimitCopy {
  title: string;
  body: string;
  reassurance: string;
  ctaLabel: string;
  ctaHref: string;
}

export const DAILY_LIMIT_COPY: Record<DailyGuardFeature, DailyLimitCopy> = {
  quote_analysis_monthly: {
    title: "Vous avez beaucoup avancé aujourd'hui.",
    body: "Vous avez comparé vos soumissions disponibles pour aujourd'hui.",
    reassurance: "Revenez demain pour comparer d'autres soumissions avec UNPRO.",
    ctaLabel: "Revenir à mon Passeport Maison",
    ctaHref: "/dashboard/proprietes",
  },
  ai_design_monthly: {
    title: "Vos designs d'aujourd'hui sont prêts.",
    body: "Vos photos, projets et designs déjà générés restent disponibles.",
    reassurance: "Revenez demain pour explorer d'autres possibilités pour votre maison.",
    ctaLabel: "Voir mes designs",
    ctaHref: "/design",
  },
};

/** Mention légale discrète affichée sous les cartes tarifaires propriétaires. */
export const FAIR_USE_NOTICE =
  "Les offres illimitées sont soumises à notre politique d'utilisation raisonnable.";

export interface DailyLimitPayload {
  daily_limit_reached: true;
  feature: DailyGuardFeature;
  title: string;
  body: string;
  reassurance: string;
  cta_label: string;
  cta_href: string;
  resets_at: string;
}

/** Détecte la réponse serveur « revenez demain » (429 garde-fou quotidien). */
export function parseDailyLimit(raw: unknown): DailyLimitPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.daily_limit_reached !== true) return null;
  const feature = (r.feature as DailyGuardFeature) ?? "ai_design_monthly";
  const fallback = DAILY_LIMIT_COPY[feature] ?? DAILY_LIMIT_COPY.ai_design_monthly;
  return {
    daily_limit_reached: true,
    feature,
    title: String(r.title ?? fallback.title),
    body: String(r.body ?? fallback.body),
    reassurance: String(r.reassurance ?? fallback.reassurance),
    cta_label: String(r.cta_label ?? fallback.ctaLabel),
    cta_href: String(r.cta_href ?? fallback.ctaHref),
    resets_at: String(r.resets_at ?? ""),
  };
}
