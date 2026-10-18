/**
 * UNPRO — Offre entrepreneur courante (SOURCE UNIQUE de la formulation publique).
 *
 * L'offre réelle est décidée par le serveur (`resolve_contractor_offer`) :
 * 12 mois gratuits (10 premières entreprises admissibles par ville),
 * Activation Express 350 $, ou aucune offre. Jamais « 3 rendez-vous gratuits ».
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

  headline: "Activez votre profil d'entreprise sur UNPRO.",
  subheadline: "Activation unique de 350 $ + taxes : votre profil et 12 mois de Présence IA sur UNPRO.",
  supporting:
    "Aucun rendez-vous inclus par défaut. Prix et taxes affichés avant le paiement.",

  ctaPrimary: "Activer mon profil — 350 $ + taxes",
  ctaClaim: "Réclamer mon profil",
  ctaSecondary: "Voir mon analyse gratuite",

  noPaymentNote: "Activation unique 350 $ + taxes · profil + 12 mois de Présence IA sur UNPRO · aucun rendez-vous inclus par défaut",
  planNote:
    "Votre plan personnalisé est calculé après l'activation, selon votre territoire et vos objectifs.",

  /** Rareté sans chiffre — utilisée quand aucune donnée de quota fiable n'existe. */
  /** Aucune rareté publique tant qu'aucun quota serveur n'est fourni. */
  scarcityGeneric: "",
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
