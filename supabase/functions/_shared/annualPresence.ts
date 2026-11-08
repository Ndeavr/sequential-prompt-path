/**
 * Présence IA annuelle (350 $ + taxes par année : profil + 12 mois).
 *
 * Source unique côté serveur : `public.annual_presence_decision(contractor)`
 * (dernier paiement 350 $ signé, non annulé, de moins de 12 mois; abonnement
 * actif; droit historique figé à l'entrée en vigueur de la règle). Aucun
 * indicateur du navigateur, aucun « code de plan non vide », aucun simple
 * `activation_status` ne vaut preuve.
 *
 * Achat d'un forfait de rendez-vous :
 * - Présence valide (ou droit historique) → forfait seulement;
 * - sinon → UNE ligne 350 $ unique ajoutée au même paiement (aucune deuxième
 *   facturation avant expiration; renouvellement MANUEL, jamais automatique).
 */
export const ANNUAL_PRESENCE_CENTS = 35000;
export const ANNUAL_PRESENCE_LINE_TYPE = "annual_presence_350";
/** Propositions affiliées émises avant cette date : conditions d'origine (forfait seul). */
export const ANNUAL_PRESENCE_RULE_EFFECTIVE_AT = "2026-11-08T21:00:00Z";

export type AnnualPresenceReason =
  | "valid_annual_presence"
  | "historical_subscription"
  | "historical_activation"
  | "existing_promotion"
  | "annual_presence_required"
  | "annual_presence_expired"
  | "historical_right_review_required";

export interface AnnualPresenceDecision {
  /** true = la ligne 350 $ est ajoutée au paiement du forfait. */
  include: boolean;
  reason: AnnualPresenceReason;
  validUntil: string | null;
  /** Droit antérieur non prouvé : ni accordé ni facturé, aucun paiement avant la revue UNPRO. */
  blocked?: true;
}

export const HISTORICAL_REVIEW_MESSAGE =
  "Votre activation antérieure doit être confirmée par l'équipe UNPRO avant ce paiement. Aucun paiement n'a été créé; vos droits actuels restent inchangés.";

/** Interprète la décision SQL; une réponse illisible échoue fermé (aucun paiement). */
export function decideAnnualPresence(input: {
  rpc: unknown;
  /** Proposition affiliée validée par le serveur et émise AVANT la règle annuelle. */
  preRuleProposal: boolean;
}): AnnualPresenceDecision | null {
  const r = input.rpc as { required?: unknown; reason?: unknown; valid_until?: unknown; blocked?: unknown } | null;
  if (!r || typeof r.required !== "boolean" || typeof r.reason !== "string") return null;
  if (r.blocked === true) {
    // Seule raison de blocage reconnue; une proposition antérieure ne lève pas une revue.
    return r.reason === "historical_right_review_required"
      ? { include: false, reason: "historical_right_review_required", validUntil: null, blocked: true }
      : null;
  }
  const validUntil = typeof r.valid_until === "string" ? r.valid_until : null;
  if (!r.required) {
    const ok = ["valid_annual_presence", "historical_subscription", "historical_activation"];
    if (!ok.includes(r.reason)) return null;
    return { include: false, reason: r.reason as AnnualPresenceReason, validUntil };
  }
  if (input.preRuleProposal) return { include: false, reason: "existing_promotion", validUntil: null };
  return { include: true, reason: r.reason === "annual_presence_expired" ? "annual_presence_expired" : "annual_presence_required", validUntil: null };
}

export function isPreRuleProposal(createdAt: unknown): boolean {
  if (typeof createdAt !== "string") return false;
  const t = Date.parse(createdAt);
  return Number.isFinite(t) && t < Date.parse(ANNUAL_PRESENCE_RULE_EFFECTIVE_AT);
}

/** Ligne unique, ponctuelle (non récurrente), taxable, identifiable par le webhook. */
export function annualPresenceLineItem() {
  return {
    price_data: {
      currency: "cad",
      unit_amount: ANNUAL_PRESENCE_CENTS,
      product_data: {
        name: "Présence IA UNPRO — profil + 12 mois (350 $ + taxes par année, renouvellement manuel)",
        metadata: { type: ANNUAL_PRESENCE_LINE_TYPE },
      },
    },
    quantity: 1,
  };
}

export const ANNUAL_PRESENCE_SESSION_METADATA = {
  annual_presence: "included",
  annual_presence_cents: String(ANNUAL_PRESENCE_CENTS),
} as const;

/** Une session ouverte n'est réutilisable que si elle porte la même décision Présence. */
export function sessionMatchesPresence(sessionMetadata: Record<string, unknown> | null | undefined, include: boolean): boolean {
  const tagged = sessionMetadata?.annual_presence === "included";
  return tagged === include;
}

type LineItem = {
  amount_subtotal?: number | null;
  amount_discount?: number | null;
  quantity?: number | null;
  currency?: string | null;
  price?: { type?: string | null; unit_amount?: number | null; product?: unknown } | null;
};

/**
 * Webhook : la ligne Présence d'une session combinée est-elle exactement
 * 350 $ CAD, ponctuelle, quantité 1, sans remise ? Toute autre forme = aucun droit.
 */
export function verifyCombinedPresenceLine(session: {
  payment_status?: string | null;
  currency?: string | null;
  metadata?: Record<string, unknown> | null;
}, lines: LineItem[]): { ok: true } | { ok: false; reason: string } {
  if (session.metadata?.annual_presence !== "included" || session.metadata?.annual_presence_cents !== String(ANNUAL_PRESENCE_CENTS)) return { ok: false, reason: "not_tagged" };
  if (session.payment_status !== "paid") return { ok: false, reason: "unpaid" };
  if ((session.currency ?? "").toLowerCase() !== "cad") return { ok: false, reason: "currency" };
  const matches = lines.filter((l) => {
    const product = l.price?.product as { metadata?: Record<string, unknown> } | string | null | undefined;
    return typeof product === "object" && product?.metadata?.type === ANNUAL_PRESENCE_LINE_TYPE;
  });
  if (matches.length !== 1) return { ok: false, reason: matches.length ? "multiple_lines" : "missing_line" };
  const l = matches[0];
  if (l.quantity !== 1) return { ok: false, reason: "quantity" };
  if (l.price?.type !== "one_time") return { ok: false, reason: "recurring" };
  if (l.price?.unit_amount !== ANNUAL_PRESENCE_CENTS || l.amount_subtotal !== ANNUAL_PRESENCE_CENTS) return { ok: false, reason: "amount" };
  if ((l.amount_discount ?? 0) !== 0) return { ok: false, reason: "discounted" };
  if ((l.currency ?? "cad").toLowerCase() !== "cad") return { ok: false, reason: "currency" };
  return { ok: true };
}

/** Le garde SQL a refusé un deuxième 350 $ pendant une Présence encore valide. */
export function isPresenceOverlapError(message: string | null | undefined): boolean {
  return !!message && /annual_presence_still_valid/.test(message);
}
