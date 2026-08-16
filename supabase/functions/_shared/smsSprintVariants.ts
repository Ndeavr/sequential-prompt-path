// SMS pitch variants for the founder sprint.
// [owner] uses owner_name if present else company_name.
//
// OFFRE CANONIQUE : pack d'entrée 350 $ (paiement unique), annoncé publiquement
// « jusqu'à 5 rendez-vous exclusifs garantis ». Le nombre exact est TOUJOURS
// calculé par le moteur avant paiement — jamais promis dans un SMS.
// L'ancienne activation à 1 $ est retirée de toutes les surfaces publiques.

export type VariantKey = "A" | "B" | "C" | "D" | "E";
export type Phase = "initial" | "followup_24h" | "followup_48h";

export function renderVariant(v: VariantKey, ctx: {
  owner: string; city: string; category: string; link: string;
}): string {
  const { owner, city, category, link } = ctx;
  switch (v) {
    case "A":
      return `Bonjour ${owner}, UNPRO garantit des rendez-vous exclusifs aux entrepreneurs québécois. Jusqu'à 5 rendez-vous garantis dès 350$: ${link}`;
    case "B":
      return `Bonjour ${owner}, UNPRO ce n'est pas des leads partagés. Rendez-vous exclusifs garantis pour ${category} à ${city}, jusqu'à 5 dès 350$: ${link}`;
    case "C":
      return `Bonjour ${owner}, les propriétaires demandent maintenant à l'IA qui engager. UNPRO vous rend recommandable et garantit jusqu'à 5 rendez-vous dès 350$: ${link}`;
    case "D":
      return `Bonjour ${owner}, on voit de la demande pour ${category} à ${city}. Voyez ce que 350$ peut vous garantir en rendez-vous exclusifs: ${link}`;
    case "E":
      return `Bonjour ${owner}, UNPRO ouvre un accès limité pour les entrepreneurs ${category} à ${city}. Jusqu'à 5 rendez-vous exclusifs garantis dès 350$: ${link}`;
  }
}

export function renderFollowup(phase: Phase, ctx: {
  owner: string; city: string; category: string; link: string;
}): string {
  const { owner, city, category, link } = ctx;
  if (phase === "followup_24h") {
    return `Rappel rapide ${owner} — votre calcul de garantie UNPRO est encore disponible. Voyez combien de rendez-vous exclusifs 350$ peut vous garantir: ${link}`;
  }
  return `Dernière note ${owner} — UNPRO ouvre un nombre limité de places pour ${category} à ${city}. Jusqu'à 5 rendez-vous exclusifs garantis dès 350$: ${link}`;
}
