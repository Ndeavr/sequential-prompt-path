/**
 * UNPRO — Copie canonique de la politique d'utilisation raisonnable (garde-fou quotidien).
 * Miroir Deno de `src/lib/copy/usagePolicy.ts`. Jamais de message technique côté utilisateur.
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

/** Prochain minuit à Toronto, en ISO UTC. */
export function nextTorontoMidnightISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const hours = get("hour") === 24 ? 0 : get("hour");
  const msIntoDay = (hours * 60 + get("minute")) * 60_000;
  const msLeft = 24 * 60 * 60_000 - msIntoDay;
  return new Date(now.getTime() + msLeft).toISOString();
}
