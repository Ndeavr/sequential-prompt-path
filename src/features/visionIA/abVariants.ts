/**
 * UNPRO — Vision IA 5 Ans : A/B variants
 * Affectation déterministe par companyId pour garantir la stabilité de l'exposition.
 */

export type CopyVariant = "emotional" | "analytical" | "urgency";
export type OrderVariant = "worst_first" | "best_first" | "unpro_first";
export type CTAVariant = "report" | "activate" | "discover";
export type SMSVariant = "ai_analysis" | "chatgpt" | "growth_signals";

export const COPY_VARIANTS: Record<CopyVariant, { title: string; subtitle: string }> = {
  emotional: {
    title: "Où l'IA voit-elle votre entreprise dans 5 ans?",
    subtitle:
      "Nous avons analysé votre présence numérique actuelle. Si rien ne change, voici la trajectoire que l'IA prévoit pour votre entreprise.",
  },
  analytical: {
    title: "Votre projection IA sur 5 ans",
    subtitle:
      "Analyse complète de vos signaux numériques : avis, site web, autorité locale et visibilité dans les moteurs IA.",
  },
  urgency: {
    title: "Votre entreprise face à l'IA : la prochaine décennie",
    subtitle:
      "80 % des recherches passent désormais par l'IA. Voici ce qu'elle prévoit pour votre entreprise dans 5 ans.",
  },
};

export const CTA_VARIANTS: Record<CTAVariant, string> = {
  report: "Voir mon rapport complet",
  activate: "Activer ma trajectoire IA",
  discover: "Découvrir mon plan",
};

export const SMS_VARIANTS: Record<SMSVariant, (firstName: string, business: string, link: string) => string> = {
  ai_analysis: (f, b, l) =>
    `Bonjour ${f}, nous avons demandé à l'IA d'analyser la présence numérique de ${b}. Voulez-vous voir où elle prévoit que votre entreprise sera dans 5 ans? ${l}`,
  chatgpt: (_f, _b, l) =>
    `Si ChatGPT analysait votre entreprise aujourd'hui, que penserait-il de son avenir? Votre rapport personnalisé est prêt : ${l}`,
  growth_signals: (_f, b, l) =>
    `L'IA a identifié plusieurs signaux de croissance pour ${b}. Découvrez votre projection 5 ans : ${l}`,
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T extends string>(seed: string, salt: string, options: readonly T[]): T {
  return options[hash(seed + ":" + salt) % options.length];
}

export interface VisionIAVariantBundle {
  copy: CopyVariant;
  order: OrderVariant;
  cta: CTAVariant;
  sms: SMSVariant;
}

export function assignVariants(companyId: string): VisionIAVariantBundle {
  return {
    copy: pick(companyId, "copy", ["emotional", "analytical", "urgency"] as const),
    order: pick(companyId, "order", ["worst_first", "best_first", "unpro_first"] as const),
    cta: pick(companyId, "cta", ["report", "activate", "discover"] as const),
    sms: pick(companyId, "sms", ["ai_analysis", "chatgpt", "growth_signals"] as const),
  };
}

export function orderScenarios<T>(order: OrderVariant, items: { no_change: T; growth: T; unpro: T }): Array<{ key: "no_change" | "growth" | "unpro"; data: T }> {
  const map = {
    worst_first: ["no_change", "growth", "unpro"],
    best_first: ["unpro", "growth", "no_change"],
    unpro_first: ["unpro", "no_change", "growth"],
  } as const;
  return map[order].map((k) => ({ key: k as any, data: (items as any)[k === "growth" ? "growth" : k] }));
}
