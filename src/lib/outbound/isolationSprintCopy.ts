/**
 * First-Dollar Sprint — 5 SMS variants for isolation QC contractors.
 * Each SMS routes to /isolation-qc with UTM for attribution.
 */

export type SprintVariant = "A" | "B" | "C" | "D" | "E";

export interface SprintCopyContext {
  company: string;
  city: string;
  category?: string; // default "isolation"
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

export const SPRINT_TEMPLATES: Record<
  SprintVariant,
  { name: string; angle: string; build: (ctx: SprintCopyContext) => string }
> = {
  A: {
    name: "Revenue",
    angle: "Demandes actives + activation 1$",
    build: (ctx) =>
      `Bonjour ${ctx.company}.\n\nNous avons actuellement des demandes actives en ${ctx.city} pour ${ctx.category ?? "isolation"}.\n\nActivation entrepreneur: 1$ pour 7 jours.\n\nSi votre entreprise est admissible, vous pourrez recevoir des rendez-vous exclusifs.\n\n👉 ${link("A", ctx)}`,
  },
  B: {
    name: "Competitor Fear",
    angle: "IA recommande vos concurrents",
    build: (ctx) =>
      `Pendant que plusieurs entrepreneurs dépensent encore sur Google Ads, certains commencent à être recommandés directement par l'IA.\n\nVotre entreprise est-elle visible lorsque les propriétaires demandent un entrepreneur en ${ctx.category ?? "isolation"}?\n\nActivation 7 jours: 1$\n\n👉 ${link("B", ctx)}`,
  },
  C: {
    name: "Social Proof",
    angle: "Places limitées",
    build: (ctx) =>
      `Nous recherchons actuellement quelques entrepreneurs ${ctx.category ?? "isolation"} pour compléter notre réseau dans ${ctx.city}.\n\nPlusieurs places sont déjà occupées.\n\nEssai 7 jours: 1$\n\n👉 ${link("C", ctx)}`,
  },
  D: {
    name: "Demand",
    angle: "Propriétaires cherchent maintenant",
    build: (ctx) =>
      `Bonjour.\n\nDes propriétaires recherchent actuellement un entrepreneur ${ctx.category ?? "isolation"} dans votre secteur.\n\nNous vérifions les entreprises avant recommandation.\n\nVoir votre admissibilité:\n\n👉 ${link("D", ctx)}`,
  },
  E: {
    name: "Curiosity",
    angle: "Question rapide IA",
    build: (ctx) =>
      `Question rapide.\n\nSi un propriétaire demandait aujourd'hui:\n\n"Quel est le meilleur entrepreneur ${ctx.category ?? "isolation"} dans ${ctx.city}?"\n\nVotre entreprise apparaîtrait-elle?\n\nVérifiez gratuitement:\n\n👉 ${link("E", ctx)}`,
  },
};

export const SPRINT_VARIANTS: SprintVariant[] = ["A", "B", "C", "D", "E"];
