/**
 * Onboarding SMS — « Être recommandé » repositioning.
 *
 * 6 variants + 1 champion (A/B principal) aligned with the Passeport Maison
 * positioning: UNPRO ne vend pas de leads, UNPRO recommande.
 *
 * All SMS route to /isolation-qc with UTM `camp=<variant>` for attribution.
 */

export type SprintVariant =
  | "curiosity"
  | "ai"
  | "competitor"
  | "opportunity"
  | "founder"
  | "passport"
  | "champion";

export interface SprintCopyContext {
  company: string;
  city: string;
  category?: string; // default: "entrepreneur"
  prenom?: string;   // optional first name
}

const link = (v: SprintVariant, ctx: SprintCopyContext) => {
  const params = new URLSearchParams({
    src: "sms",
    camp: v,
    city: ctx.city,
    company: ctx.company,
  });
  return `https://unpro.ca/isolation-qc?${params.toString()}`;
};

const salut = (ctx: SprintCopyContext) =>
  ctx.prenom?.trim() ? `Bonjour ${ctx.prenom.trim()},` : "Bonjour,";

const cat = (ctx: SprintCopyContext) => ctx.category ?? "entrepreneur";

export const SPRINT_TEMPLATES: Record<
  SprintVariant,
  { name: string; angle: string; build: (ctx: SprintCopyContext) => string }
> = {
  curiosity: {
    name: "Curiosité",
    angle: "Votre entreprise mérite-t-elle d'être recommandée ?",
    build: (ctx) =>
      `${salut(ctx)}\n\nVotre entreprise mérite-t-elle d'être recommandée ?\n\nUNPRO analyse l'expertise, la réputation, le territoire et la capacité des entrepreneurs afin d'identifier les meilleurs candidats pour chaque projet.\n\nDécouvrez si votre entreprise est admissible.\n\n${link("curiosity", ctx)}`,
  },
  ai: {
    name: "IA",
    angle: "Apparaissez-vous dans les recommandations IA ?",
    build: (ctx) =>
      `${salut(ctx)}\n\nLes propriétaires demandent de plus en plus à l'IA quels professionnels choisir.\n\nVotre entreprise apparaît-elle parmi les recommandations ?\n\nÉvaluation gratuite :\n\n${link("ai", ctx)}`,
  },
  competitor: {
    name: "Concurrent",
    angle: "Vous ou un concurrent recommandé ?",
    build: (ctx) =>
      `${salut(ctx)}\n\nLorsqu'un propriétaire recherche un ${cat(ctx)} dans votre région, est-ce votre entreprise ou celle d'un concurrent qui est recommandée ?\n\nDécouvrez votre positionnement sur UNPRO.\n\n${link("competitor", ctx)}`,
  },
  opportunity: {
    name: "Opportunité",
    angle: "UNPRO ne vend pas de listes",
    build: (ctx) =>
      `${salut(ctx)}\n\nUNPRO ne vend pas de listes de clients.\n\nNous aidons les propriétaires à prendre de meilleures décisions et les entrepreneurs qualifiés à être recommandés.\n\nVoyez si votre entreprise est admissible :\n\n${link("opportunity", ctx)}`,
  },
  founder: {
    name: "Fondateur",
    angle: "Places fondatrices dans votre secteur",
    build: (ctx) =>
      `${salut(ctx)}\n\nNous ouvrons actuellement les places fondatrices UNPRO dans votre secteur.\n\nL'objectif : aider les meilleurs entrepreneurs à être recommandés aux bons propriétaires, au bon moment.\n\nVérifiez votre admissibilité :\n\n${link("founder", ctx)}`,
  },
  passport: {
    name: "Passeport Maison",
    angle: "Recommandé via le Passeport Maison",
    build: (ctx) =>
      `${salut(ctx)}\n\nUNPRO construit le Passeport Maison des propriétaires.\n\nLorsque des travaux sont requis, notre IA identifie les professionnels les plus pertinents selon le projet, la région et les besoins réels.\n\nVotre entreprise pourrait-elle être recommandée ?\n\n${link("passport", ctx)}`,
  },
  champion: {
    name: "Champion A/B",
    angle: "SMS le plus fort — test principal",
    build: (ctx) =>
      `${salut(ctx)}\n\nVotre entreprise mérite-t-elle d'être recommandée ?\n\nUNPRO analyse votre expertise, votre réputation, votre territoire et votre capacité afin d'identifier les situations où votre entreprise représente un excellent choix.\n\nUNPRO vous aide à être recommandé.\n\nDécouvrez votre admissibilité :\n\n${link("champion", ctx)}\n\nSTOP = retrait.`,
  },
};

export const SPRINT_VARIANTS: SprintVariant[] = [
  "curiosity",
  "ai",
  "competitor",
  "opportunity",
  "founder",
  "passport",
  "champion",
];
