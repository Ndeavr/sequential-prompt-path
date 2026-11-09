/**
 * Offre campagne /allume — « 350 $ : 10 contrats garantis ».
 * Source unique (frontend + Edge) des conditions publiques et des règles pures.
 * La version immuable vit en base (contractor_offer_versions); ces constantes
 * doivent la refléter exactement (vérifié par test).
 */

export const GUARANTEE_OFFER_CODE = "allume_350_10_contrats_v1";
/** Valeur d'URL publique (whitelist) qui sélectionne cette offre avant paiement. */
export const GUARANTEE_OFFER_PARAM = "10-contrats";

export const GUARANTEE_OFFER = {
  code: GUARANTEE_OFFER_CODE,
  baseAmountCents: 35000,
  termMonths: 12,
  guaranteedContracts: 10,
  refundPerMissingCents: 3500,
  refundCapCents: 35000,
  autoRenew: false,
} as const;

export const GUARANTEE_COPY = {
  headline: "350 $ : 10 contrats garantis",
  conditions: "10 contrats acceptés par vous et vos clients en 12 mois. À l'échéance, 35 $ remboursés par contrat manquant.",
  details: [
    "350 $ CA avant taxes, payés une fois. Si les taxes du Québec s'appliquent : 402,41 $ CA.",
    "La période de 12 mois commence à la confirmation du paiement.",
    "Un contrat compte quand vous ET votre client l'avez accepté, pour vos services et votre territoire.",
    "Un rendez-vous, une demande de soumission, une soumission envoyée ou une inscription ne comptent pas comme contrat.",
    "Aucun montant minimum de contrat.",
    "À l'échéance : 35 $ par contrat manquant (maximum 350 $), avec la part correspondante des taxes payées.",
    "Aucun renouvellement automatique.",
  ],
  stripeName: "UNPRO — 10 contrats garantis",
  stripeDescription: "Profil entrepreneur + 12 mois de Présence IA. 10 contrats acceptés par vous et vos clients en 12 mois; à l'échéance, 35 $ remboursés par contrat manquant (max. 350 $). Paiement unique, aucun renouvellement automatique.",
  stripeSubmit: "350 $ CA avant taxes. TPS : 17,50 $; TVQ : 34,91 $; total : 402,41 $ CA. 10 contrats acceptés par vous et vos clients en 12 mois; à l'échéance, 35 $ remboursés par contrat manquant. Paiement unique.",
} as const;

/** 35 $ × max(0, 10 − contrats comptés), plafonné à 350 $ (base hors taxes, en cents). */
export function guaranteeRefundBaseCents(
  counted: number,
  o: { guaranteedContracts: number; refundPerMissingCents: number; refundCapCents: number } = GUARANTEE_OFFER,
): number {
  const n = Math.max(0, Math.floor(Number.isFinite(counted) ? counted : 0));
  return Math.min(Math.max(o.refundCapCents, 0), Math.max(o.refundPerMissingCents, 0) * Math.max(0, o.guaranteedContracts - n));
}

/** Part des taxes payées correspondant à la base remboursée (estimation affichée à l'admin). */
export function guaranteeRefundTotalEstimateCents(baseCents: number, subtotalCents: number, totalCents: number): number {
  if (subtotalCents <= 0) return 0;
  return Math.round((baseCents * totalCents) / subtotalCents);
}

export type GuaranteeRecordKind = "contract" | "appointment" | "quote_request" | "quote_sent" | "prospect" | "signup";

export interface GuaranteeRecordCandidate {
  kind: GuaranteeRecordKind;
  contractorAcceptedAt: string | null;
  clientAcceptedAt: string | null;
  clientAcceptanceEvidence: string | null;
  scopeMatches: boolean | null;
}

/** Miroir du déclencheur SQL : seul un contrat accepté et prouvé des deux côtés, dans la période, compte. */
export function isCountedContract(c: GuaranteeRecordCandidate, window: { paidAt: string; endsAt: string }, now = Date.now()): boolean {
  if (c.kind !== "contract") return false;
  if (!c.contractorAcceptedAt || !c.clientAcceptedAt) return false;
  if ((c.clientAcceptanceEvidence ?? "").trim().length < 10) return false;
  if (c.scopeMatches !== true) return false;
  const start = Date.parse(window.paidAt);
  const end = Date.parse(window.endsAt);
  const clientT = Date.parse(c.clientAcceptedAt);
  if (!(clientT <= Math.min(end, now))) return false;
  return [c.contractorAcceptedAt, c.clientAcceptedAt].every((d) => {
    const t = Date.parse(d);
    return Number.isFinite(t) && t >= start && t <= end;
  });
}

export function isGuaranteeOfferParam(value: string | null | undefined): boolean {
  return value === GUARANTEE_OFFER_PARAM;
}

interface PaidSessionLike {
  payment_status?: string | null;
  amount_subtotal?: number | null;
  amount_total?: number | null;
  currency?: string | null;
  total_details?: { amount_discount?: number | null; amount_tax?: number | null } | null;
  metadata?: Record<string, string | undefined> | null;
}

/**
 * Arguments de record_contract_guarantee_payment pour une session déjà vérifiée
 * par le webhook signé; null si la session ne porte pas exactement cette offre
 * au prix complet (aucun code promo ni rabais).
 */
export function guaranteeRecordArgs(
  session: PaidSessionLike & { id: string; payment_intent?: unknown },
  event: { id: string; livemode?: boolean | null; created?: number | null },
  contractorId: string,
): Record<string, unknown> | null {
  const md = session.metadata ?? {};
  if (md.offer !== "entry_activation_350" || md.offer_version !== GUARANTEE_OFFER_CODE) return null;
  if (session.payment_status !== "paid") return null;
  if (session.amount_subtotal !== GUARANTEE_OFFER.baseAmountCents) return null;
  if ((session.currency ?? "").toLowerCase() !== "cad") return null;
  if ((session.total_details?.amount_discount ?? 0) !== 0 || md.promo_code_id) return null;
  const pi = typeof session.payment_intent === "string"
    ? session.payment_intent
    : (session.payment_intent as { id?: string } | null)?.id ?? null;
  return {
    p_contractor_id: contractorId,
    p_offer_version: GUARANTEE_OFFER_CODE,
    p_stripe_mode: event.livemode === true ? "live" : "test",
    p_session_id: session.id,
    p_payment_intent: pi,
    p_event_id: event.id,
    p_subtotal_cents: session.amount_subtotal,
    p_tax_cents: session.total_details?.amount_tax ?? 0,
    p_total_cents: session.amount_total ?? session.amount_subtotal,
    p_discount_cents: session.total_details?.amount_discount ?? 0,
    p_paid_at: new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
  };
}
