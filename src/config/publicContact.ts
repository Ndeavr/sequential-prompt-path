/**
 * UNPRO — numéro PUBLIC officiel (expéditeur Twilio). Seule source pour les CTA d'appel.
 * Le numéro de transfert privé reste exclusivement côté serveur (secret backend).
 */
export const PUBLIC_PHONE = {
  display: "450-328-6776",
  e164: "+14503286776",
  tel: "tel:+14503286776",
} as const;
