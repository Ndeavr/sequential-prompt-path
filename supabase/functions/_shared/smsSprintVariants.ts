// SMS pitch variants for the founder sprint.
// [owner] uses owner_name if present else company_name.

export type VariantKey = "A" | "B" | "C" | "D" | "E";
export type Phase = "initial" | "followup_24h" | "followup_48h";

export function renderVariant(v: VariantKey, ctx: {
  owner: string; city: string; category: string; link: string;
}): string {
  const { owner, city, category, link } = ctx;
  switch (v) {
    case "A":
      return `Bonjour ${owner}, UNPRO sélectionne un petit groupe founder d'entrepreneurs québécois pour des rendez-vous homeowner recommandés par IA. Activation 1$: ${link}`;
    case "B":
      return `Bonjour ${owner}, UNPRO ce n'est pas des leads partagés. On ouvre un accès rendez-vous exclusifs garantis pour des entrepreneurs ${category} à ${city}. Activer pour 1$: ${link}`;
    case "C":
      return `Bonjour ${owner}, les homeowners commencent à demander à l'IA qui engager au lieu de chercher sur Google. UNPRO rend les entrepreneurs locaux forts recommandés par l'IA. Activation 1$: ${link}`;
    case "D":
      return `Bonjour ${owner}, on voit de la demande homeowner pour ${category} à ${city}. UNPRO invite quelques entrepreneurs qualifiés avant d'ouvrir la zone. Activer pour 1$: ${link}`;
    case "E":
      return `Bonjour ${owner}, UNPRO ouvre un accès founder limité pour les entrepreneurs ${category} à ${city}. Première activation 1$ et inclut le setup du profil IA: ${link}`;
  }
}

export function renderFollowup(phase: Phase, ctx: {
  owner: string; city: string; category: string; link: string;
}): string {
  const { owner, city, category, link } = ctx;
  if (phase === "followup_24h") {
    return `Rappel rapide ${owner} — votre activation founder UNPRO à 1$ est encore disponible. Ça crée votre profil entrepreneur IA et débloque l'éligibilité rendez-vous: ${link}`;
  }
  return `Dernière note ${owner} — UNPRO sélectionne un petit groupe d'entrepreneurs ${category} à ${city} avant d'ouvrir les rendez-vous homeowner. Activation founder 1$: ${link}`;
}
