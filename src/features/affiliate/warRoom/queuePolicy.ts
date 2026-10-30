/**
 * Politique de contact d'une ligne de file manuelle (affilié).
 * Échec fermé : un canal n'est permis que si le SERVEUR (manual_queue_for_me)
 * a renvoyé la coordonnée et n'a pas verrouillé la ligne. Aucun déverrouillage
 * basé sur le type de file côté client; aucune autorisation inventée.
 */
export type QueueRowPolicyInput = {
  queue: string | null;
  contact_locked: boolean | null;
  opted_out: boolean | null;
  phone_e164: string | null;
  email: string | null;
  blocked_reason: string | null;
};

export function queueRowPolicy(r: QueueRowPolicyInput) {
  const locked = r.contact_locked !== false || r.opted_out === true;
  const reason = r.opted_out
    ? "Opposition enregistrée : aucun contact."
    : locked
      ? r.blocked_reason ?? "Autorisation de contact non démontrée par le serveur."
      : null;
  return {
    contact_locked: locked,
    can_call: !locked && !!r.phone_e164,
    can_sms: !locked && !!r.phone_e164,
    can_email: !locked && !!r.email,
    blocked_reason: reason,
  };
}

/** Libellé honnête de l'étape : une étape dérivée n'est pas un abandon prouvé. */
export function recoveryStageLabel(stage: string | null): string {
  if (stage === "checkout_opened")
    return "Paiement ouvert selon le journal dérivé — non confirmé par Stripe, aucun abandon prouvé";
  if (!stage) return "Étape inconnue";
  return stage;
}

export type EmptyCta = "load" | "add_prospect" | "retry";
/** Action du bouton principal sans prospect : jamais de boucle silencieuse. */
export function emptyCtaAction(hasProspect: boolean, emptyReason: string | null, error: string | null): EmptyCta {
  if (hasProspect) return "load";
  if (error) return "retry";
  if (emptyReason) return "add_prospect";
  return "load";
}
