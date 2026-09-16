/**
 * UNPRO — Étapes canoniques du tunnel entrepreneur (source unique).
 *
 * Une seule liste ordonnée, utilisée par toutes les surfaces et par les
 * rapports. Chaque étape n'est comptée qu'une fois par session grâce à une clé
 * d'idempotence déterministe (index unique partiel sur `dedupe_key`).
 */

import { logFunnelEvent, type FunnelEventType } from "@/lib/analytics/logFunnelEvent";

/** Ordre exact du tunnel, de la première vue au compte activé. */
export const CONTRACTOR_FUNNEL_STEPS = [
  "audit_opened",
  "company_recognized",
  "profile_started",
  "profile_completed",
  "quote_computed",
  "plan_presented",
  "checkout_created",
  "payment_succeeded",
  "account_activated",
] as const;

export type ContractorFunnelStep = (typeof CONTRACTOR_FUNNEL_STEPS)[number];

/** Libellés lisibles (FR) pour les rapports internes. */
export const CONTRACTOR_FUNNEL_STEP_LABELS: Record<ContractorFunnelStep, string> = {
  audit_opened: "Audit IA ouvert",
  company_recognized: "Entreprise reconnue",
  profile_started: "Profil commencé",
  profile_completed: "Profil complété",
  quote_computed: "Devis calculé",
  plan_presented: "Plan présenté",
  checkout_created: "Paiement créé",
  payment_succeeded: "Paiement réussi",
  account_activated: "Compte activé",
};

/** Type d'événement canonique écrit en base pour chaque étape. */
const STEP_EVENT_TYPE: Record<ContractorFunnelStep, FunnelEventType> = {
  audit_opened: "ai_audit_viewed",
  company_recognized: "company_recognized",
  profile_started: "profile_started",
  profile_completed: "profile_completed",
  quote_computed: "plan_requested",
  plan_presented: "plans_viewed",
  checkout_created: "checkout_started",
  payment_succeeded: "payment_completed",
  account_activated: "profile_activated",
};

export function funnelStepRank(step: ContractorFunnelStep): number {
  return CONTRACTOR_FUNNEL_STEPS.indexOf(step);
}

function sessionId(): string {
  try {
    const key = "unpro_funnel_session_id";
    const stored = sessionStorage.getItem(key);
    if (stored) return stored;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return "no-session";
  }
}

/**
 * Clé d'idempotence : une étape, une session, un objet (devis, entreprise…).
 * Deux appels identiques ne créent jamais deux lignes.
 */
export function funnelStepDedupeKey(
  step: ContractorFunnelStep,
  subjectId?: string | null,
): string {
  return ["step", step, sessionId(), subjectId ?? "-"].join(":");
}

export interface TrackStepInput {
  /** Identifiant de l'objet concerné (devis, entreprise, session Stripe). */
  subjectId?: string | null;
  contractorId?: string | null;
  city?: string | null;
  categorySlug?: string | null;
  offer?: string | null;
  metadata?: Record<string, unknown>;
  /** Faux pour les événements qui peuvent légitimement se répéter (échecs). */
  once?: boolean;
}

/** Écrit une étape canonique du tunnel. Ne lance jamais. */
export async function trackFunnelStep(
  step: ContractorFunnelStep,
  input: TrackStepInput = {},
): Promise<void> {
  await logFunnelEvent({
    event_type: STEP_EVENT_TYPE[step],
    step,
    contractor_id: input.contractorId ?? null,
    dedupe_key:
      input.once === false ? null : funnelStepDedupeKey(step, input.subjectId),
    metadata: {
      funnel_step: step,
      funnel_rank: funnelStepRank(step),
      subject_id: input.subjectId ?? null,
      city: input.city ?? null,
      category_slug: input.categorySlug ?? null,
      offer: input.offer ?? null,
      ...(input.metadata ?? {}),
    },
  });
}

/** Échec explicite (jamais silencieux) : motif exact conservé. */
export async function trackFunnelFailure(
  step: ContractorFunnelStep,
  reason: string,
  input: TrackStepInput = {},
): Promise<void> {
  await logFunnelEvent({
    event_type: step === "payment_succeeded" ? "stripe_payment_failed" : "activation_error",
    step: `${step}_failed`,
    contractor_id: input.contractorId ?? null,
    metadata: {
      funnel_step: step,
      failure_reason: reason,
      subject_id: input.subjectId ?? null,
      ...(input.metadata ?? {}),
    },
  });
}
