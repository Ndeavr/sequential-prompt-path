/**
 * Présence IA annuelle (350 $ + taxes par année : profil + 12 mois).
 *
 * Décide, côté serveur seulement, si un achat de forfait de rendez-vous doit
 * d'abord passer par la Présence IA annuelle. Sources canoniques :
 * - `contractor_plan_code()` : « presence » = paiement 350 $ LIVE signé, non
 *   remboursé, de moins de 12 mois; un autre code = abonnement historique actif;
 * - `contractors.activation_status` : activation historique déjà accordée;
 * - une promotion déjà validée par le serveur (proposition, jeton, code promo).
 *
 * Les droits historiques et promotions existantes sont préservés : aucun
 * client existant n'est converti en paiement annuel automatique, et aucune
 * date de renouvellement n'est inventée. Un indicateur envoyé par le
 * navigateur n'est jamais une preuve.
 */
export const ANNUAL_PRESENCE_CENTS = 35000;

export type AnnualPresenceReason =
  | "valid_annual_presence"
  | "historical_subscription"
  | "historical_activation"
  | "existing_promotion"
  | "annual_presence_required";

export interface AnnualPresenceDecision {
  required: boolean;
  reason: AnnualPresenceReason;
}

export function decideAnnualPresence(input: {
  planCode: string | null | undefined;
  activationStatus: string | null | undefined;
  hasValidatedPromotion: boolean;
}): AnnualPresenceDecision {
  const plan = (input.planCode ?? "").trim();
  if (plan === "presence") return { required: false, reason: "valid_annual_presence" };
  if (plan) return { required: false, reason: "historical_subscription" };
  if (input.activationStatus === "activated" || input.activationStatus === "active") {
    return { required: false, reason: "historical_activation" };
  }
  if (input.hasValidatedPromotion) return { required: false, reason: "existing_promotion" };
  return { required: true, reason: "annual_presence_required" };
}
