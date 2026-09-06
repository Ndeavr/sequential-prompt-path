/**
 * UNPRO — Offre entrepreneur courante (SOURCE UNIQUE de la formulation publique).
 *
 * Offre approuvée : « Vos 3 premiers rendez-vous sont gratuits. Ensuite, vous
 * décidez quel plan choisir. » Limitée aux 10 premiers entrepreneurs par ville.
 *
 * Règles strictes :
 *  - Aucun paiement, aucune carte avant l'activation du compte et du profil.
 *  - Aucune mention « 350 $ » / « paiement unique » au-dessus du pli.
 *  - Aucune rareté inventée : le nombre de places restantes provient des quotas
 *    territoriaux réels. Sans donnée fiable → formulation « selon disponibilité »
 *    SANS chiffre.
 */

export const CONTRACTOR_OFFER = {
  cityLimit: 10,
  freeAppointments: 3,

  headline: "Vos 3 premiers rendez-vous sont gratuits.",
  subheadline: "Ensuite, vous décidez quel plan choisir.",
  supporting:
    "Rendez-vous exclusifs, jamais partagés. Aucune carte de crédit et aucun paiement avant l'activation de votre profil.",

  ctaPrimary: "Activer gratuitement mon profil",
  ctaClaim: "Réclamer mon profil gratuitement",
  ctaSecondary: "Voir mon analyse gratuite",

  noPaymentNote: "Gratuit pour commencer · aucune carte requise",
  planNote:
    "Votre plan personnalisé est calculé après l'activation, selon votre territoire et vos objectifs.",

  /** Rareté sans chiffre — utilisée quand aucune donnée de quota fiable n'existe. */
  scarcityGeneric: "Places limitées aux 10 premiers entrepreneurs par ville, selon disponibilité.",
} as const;

/**
 * Phrase de rareté. `remaining` doit provenir des quotas territoriaux réels.
 * `null`/`undefined` → formulation sans chiffre (jamais de fausse rareté).
 */
export function scarcitySentence(remaining?: number | null, city?: string | null): string {
  if (remaining == null || !Number.isFinite(remaining)) return CONTRACTOR_OFFER.scarcityGeneric;
  const place = city ? ` à ${city}` : "";
  if (remaining <= 0) return `Les 10 places fondatrices${place} sont comblées. Inscription selon disponibilité.`;
  if (remaining === 1) return `1 place fondatrice restante${place} sur 10.`;
  return `${remaining} places fondatrices restantes${place} sur 10.`;
}
