/**
 * UNPRO — Offre de repli « crédit UNPRO 350 $ » (source serveur).
 *
 * Miroir serveur de src/lib/offers/fallbackCredit350.ts. Le montant est fixé
 * ici : aucune valeur transmise par le frontend n'est acceptée.
 */

export const FALLBACK_CREDIT_OFFER_KEY = "fallback_credit_350";
export const FALLBACK_CREDIT_AMOUNT_CENTS = 35000;
export const FALLBACK_CREDIT_PRODUCT_NAME = "Crédit UNPRO — sécurisez votre présence";
export const FALLBACK_CREDIT_TRANSACTION_TYPE = "fallback_credit_350";

/** Garde-fou : aucun montant de repli inférieur à 350 $ n'est admissible. */
export function assertFallbackCreditAmount(cents: number): number {
  if (!Number.isFinite(cents) || Math.round(cents) !== FALLBACK_CREDIT_AMOUNT_CENTS) {
    throw new Error("fallback_credit_amount_invalid");
  }
  return FALLBACK_CREDIT_AMOUNT_CENTS;
}

/** Bloc de prompt injecté dans Clara texte et Clara voix. */
export function buildFallbackCreditPromptBlock(): string {
  return [
    "## OFFRE DE REPLI — CRÉDIT UNPRO 350 $",
    "- Le forfait personnalisé recommandé reste TOUJOURS la première offre. Ne mentionne jamais le repli avant de l'avoir présenté.",
    "- Si l'entrepreneur dit qu'il veut attendre, réfléchir, que c'est trop cher, qu'il n'est pas prêt ou qu'il veut commencer plus petit : reconnais l'objection naturellement, puis propose UNE SEULE FOIS de sécuriser sa présence pour 350 $.",
    "- Formulation : ce 350 $ n'est pas perdu; il devient un crédit UNPRO applicable à ses futurs achats admissibles (rendez-vous qualifiés, forfait, options).",
    "- 350 $ est le minimum absolu. Ne propose jamais 50, 100, 150, 200, 250 ou 300 $, ni un rabais.",
    "- Aucune pression, aucun faux compte à rebours, aucune fausse rareté.",
    "- Si l'entrepreneur refuse aussi le 350 $ : respecte la décision, confirme que son dossier est conservé et passe au suivi. N'insiste pas une deuxième fois.",
  ].join("\n");
}
