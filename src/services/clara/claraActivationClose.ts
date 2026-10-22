import { buildActivation350Links } from "@/lib/activation350Links";
import { getStoredAttribution } from "@/hooks/useReferralAttribution";
import { OFFER_350 } from "@/lib/copy/offer350";

/** Bounded commercial answers, not a replacement for Clara's general conversation. */
export function activationCloseAnswer(text: string): string | null {
  const value = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(plus tard|pas maintenant|pas interesse|non merci|refuse)\b/.test(value))
    return "D’accord. Votre contexte est conservé dans cette conversation; vous pourrez reprendre ici quand vous le souhaiterez. Aucun rappel n’est programmé.";
  if (/\b(rbq|licence)\b/.test(value))
    return "Le paiement ne remplace pas la vérification de votre licence RBQ, si elle est requise. Une licence invalide exclut les recommandations; aucune admissibilité n’est accordée simplement en payant.";
  if (/\b(rendez-vous|rdv)\b/.test(value))
    return "Aucun rendez-vous n’est inclus dans l’activation à 350 $ + taxes. Si vous en voulez, l’option séparée calcule le prix, le volume et les conditions selon votre métier et votre territoire; elle n’est jamais ajoutée automatiquement.";
  if (/\b(chatgpt|intelligence artificielle|ia|google)\b/.test(value))
    return "UNPRO structure votre profil, vos services et votre territoire pour sa présence IA pendant 12 mois. Aucun classement ni apparition dans ChatGPT ou Google n’est garanti.";
  if (/\b(trop cher|prix|combien|cout|cher|350|commencer|activer|interesse|allons-y|pret)\b/.test(value) || /^(oui|ok|d'accord)[.! ]*$/.test(value))
    return `${OFFER_350.alexBeforeCalculation} Si la TPS et la TVQ s’appliquent, le total est de 402,41 $. Vous investissez dans votre profil, pas dans des clics ou des leads partagés. Prêt à activer votre profil pour 350 $ + taxes?`;
  return null;
}

export function claraActivationLinks(search: string) {
  const params = new URLSearchParams(search);
  const stored = getStoredAttribution();
  if (!params.has("ref") && stored?.refCode) params.set("ref", stored.refCode);
  if (!params.has("utm_source") && stored?.utmSource) params.set("utm_source", stored.utmSource);
  return buildActivation350Links(params);
}