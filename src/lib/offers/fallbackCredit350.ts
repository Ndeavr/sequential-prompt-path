/**
 * UNPRO — Offre de repli « crédit UNPRO 350 $ ».
 *
 * Source unique (frontend) du montant, du texte et des règles de déclenchement.
 * Le montant est également fixé côté serveur : le frontend ne transmet jamais
 * de prix à Stripe.
 *
 * Règle business absolue : 350 $ est le MINIMUM de toute offre de repli payante.
 * Aucun montant inférieur ne doit être généré, nulle part.
 */

export const FALLBACK_CREDIT_OFFER_KEY = "fallback_credit_350" as const;

/** Montant exact, en cents CAD. Jamais recalculé, jamais réduit. */
export const FALLBACK_CREDIT_AMOUNT_CENTS = 35000;

export const FALLBACK_CREDIT_AMOUNT_LABEL = "350 $";

export const FALLBACK_CREDIT_COPY = {
  eyebrow: "Pas prêt pour un plan complet ?",
  title: `Sécurisez votre présence UNPRO — ${FALLBACK_CREDIT_AMOUNT_LABEL}`,
  benefits: [
    "Aucun crédit perdu",
    `${FALLBACK_CREDIT_AMOUNT_LABEL} disponibles pour vos futurs achats admissibles`,
    "Votre profil demeure actif",
    "Commencez à bâtir votre historique UNPRO",
  ],
  ctaPrimary: `Sécuriser ma présence — ${FALLBACK_CREDIT_AMOUNT_LABEL}`,
  ctaSecondary: "Pas maintenant",
  creditNotice:
    "Votre crédit sera appliqué automatiquement à vos futurs achats admissibles.",
  balanceLabel: "Crédit UNPRO disponible",
  claraOffer:
    "Je comprends, vous préférez attendre. Au minimum, vous pouvez sécuriser votre présence pour 350 $. Ce montant n'est pas perdu : il devient un crédit UNPRO applicable à vos futurs achats admissibles. Vous bâtissez votre présence sans engagement plus important aujourd'hui.",
  declined:
    "C'est noté. Je garde votre dossier tel quel, vous pourrez reprendre quand vous serez prêt.",
} as const;

/** Événements analytiques (append-only). */
export const FALLBACK_CREDIT_EVENTS = {
  shown: "fallback_350_shown",
  clicked: "fallback_350_clicked",
  checkoutCreated: "fallback_350_checkout_created",
  paymentSuccess: "fallback_350_payment_success",
  paymentFailed: "fallback_350_payment_failed",
  declined: "fallback_350_declined",
} as const;

/** Statuts portés dans la file de suivi existante (contractor_leads). */
export const FALLBACK_CREDIT_LEAD_STATUSES = [
  "plan_offered",
  "plan_declined",
  "fallback_350_offered",
  "fallback_350_checkout_started",
  "fallback_350_paid",
  "fallback_350_declined",
  "followup_required",
] as const;

export type FallbackCreditLeadStatus =
  (typeof FALLBACK_CREDIT_LEAD_STATUSES)[number];

/**
 * Formulations réelles indiquant qu'un entrepreneur n'est pas prêt à souscrire.
 * Utilisé par Clara (texte et voix) pour déclencher UNE seule tentative de repli.
 */
const NOT_READY_PATTERNS = [
  "je vais attendre",
  "je préfère attendre",
  "je prefere attendre",
  "pas maintenant",
  "plus tard",
  "peut-être plus tard",
  "peut etre plus tard",
  "je vais y penser",
  "je dois y penser",
  "laisse-moi y penser",
  "je vais réfléchir",
  "je vais reflechir",
  "trop cher",
  "c'est cher",
  "trop élevé",
  "trop eleve",
  "au-dessus de mon budget",
  "pas dans mon budget",
  "je ne suis pas prêt",
  "je ne suis pas pret",
  "pas prêt",
  "pas pret",
  "je veux essayer avant",
  "je veux tester avant",
  "commencer plus petit",
  "commencer petit",
  "quelque chose de plus petit",
];

export interface FallbackCreditTrigger {
  /** Vrai seulement si une vraie intention « pas prêt » est détectée. */
  detected: boolean;
  matched: string | null;
}

export function detectNotReadyForPlan(text: string): FallbackCreditTrigger {
  const lower = (text || "").toLowerCase();
  for (const pattern of NOT_READY_PATTERNS) {
    if (lower.includes(pattern)) return { detected: true, matched: pattern };
  }
  return { detected: false, matched: null };
}

/**
 * L'offre de repli n'est jamais affichée avant la présentation du plan
 * personnalisé, et jamais deux fois dans la même session.
 */
export function shouldOfferFallbackCredit(input: {
  planPresented: boolean;
  alreadyOffered: boolean;
  objectionDetected: boolean;
  planDeclined?: boolean;
}): boolean {
  if (!input.planPresented) return false;
  if (input.alreadyOffered) return false;
  return Boolean(input.objectionDetected || input.planDeclined);
}
