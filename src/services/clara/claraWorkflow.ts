/**
 * UNPRO — ONE CLARA : mémoire de workflow de la conversation canonique.
 *
 * Il n'existe qu'une seule mémoire Clara : la session serveur
 * (`alex_sessions` + `alex_messages`), via la fonction `clara-session`.
 * Ce module ne stocke rien localement et ne duplique aucune donnée métier :
 * il décrit uniquement l'avancement (intention, étape, éléments obtenus /
 * manquants, prochaine action, workflows suspendus).
 */
import { supabase } from "@/integrations/supabase/client";
import { peekClaraSessionToken, saveClaraContext } from "@/services/clara/claraSession";

/** Intentions canoniques du routeur Clara (jamais visibles par l'utilisateur). */
export type ClaraWorkflowIntent =
  | "affiliate_onboarding"
  | "contractor_onboarding"
  | "contractor_verification"
  | "homeowner_problem"
  | "photo_problem_analysis"
  | "video_problem_analysis"
  | "design_generation"
  | "quote_analysis"
  | "quote_comparison"
  | "contractor_search"
  | "appointment_booking"
  | "general_question";

export type ClaraWorkflowEvent =
  | "intent_detected"
  | "workflow_started"
  | "workflow_paused"
  | "workflow_resumed"
  | "workflow_completed"
  | "affiliate_onboarding_started"
  | "affiliate_onboarding_completed"
  | "contractor_onboarding_started"
  | "contractor_onboarding_completed"
  | "media_upload_started"
  | "media_upload_completed"
  | "media_upload_failed"
  | "image_analysis_started"
  | "image_analysis_completed"
  | "video_analysis_started"
  | "video_analysis_completed"
  | "design_generation_started"
  | "design_generation_completed"
  | "homeowner_record_created"
  | "contractor_match_found"
  | "appointment_booking_started"
  | "appointment_booked";

export interface ClaraSuspendedWorkflow {
  intent: ClaraWorkflowIntent;
  step?: string | null;
  next_action?: string | null;
}

export interface ClaraWorkflowState {
  intent: ClaraWorkflowIntent;
  sub_workflow?: string | null;
  step?: string | null;
  collected?: string[];
  missing?: string[];
  next_action?: string | null;
  suspended?: ClaraSuspendedWorkflow[];
  updated_at?: string;
}

/** Une simple question n'interrompt jamais un parcours en cours. */
const TRANSIENT_INTENTS: ReadonlySet<ClaraWorkflowIntent> = new Set([
  "general_question",
]);

/** Parcours longs : ils sont suspendus, jamais perdus, quand l'intention change. */
const RESUMABLE_INTENTS: ReadonlySet<ClaraWorkflowIntent> = new Set([
  "affiliate_onboarding",
  "contractor_onboarding",
  "quote_comparison",
  "appointment_booking",
]);

const MAX_SUSPENDED = 5;

/**
 * Transition pure : décide si l'intention détectée poursuit le workflow actif,
 * le suspend, ou reprend un workflow précédemment suspendu.
 * Aucune information déjà obtenue n'est perdue.
 */
export function nextWorkflowState(
  current: ClaraWorkflowState | null,
  detected: ClaraWorkflowIntent,
): { state: ClaraWorkflowState; events: ClaraWorkflowEvent[] } {
  // Aucun parcours en cours : on démarre.
  if (!current) {
    return {
      state: { intent: detected, suspended: [], collected: [], missing: [] },
      events: ["workflow_started"],
    };
  }

  // Même intention : continuité stricte, l'étape est conservée.
  if (current.intent === detected) return { state: current, events: [] };

  // Question passagère : le parcours actif reste actif.
  if (TRANSIENT_INTENTS.has(detected)) return { state: current, events: [] };

  const suspended = current.suspended ?? [];

  // L'utilisateur revient à un parcours suspendu : reprise exacte de l'étape.
  const resumedIndex = suspended.findIndex((entry) => entry.intent === detected);
  if (resumedIndex >= 0) {
    const resumed = suspended[resumedIndex];
    const rest = suspended.filter((_, index) => index !== resumedIndex);
    const keepCurrent = RESUMABLE_INTENTS.has(current.intent);
    return {
      state: {
        intent: resumed.intent,
        step: resumed.step ?? null,
        next_action: resumed.next_action ?? null,
        collected: [],
        missing: [],
        suspended: keepCurrent
          ? [{ intent: current.intent, step: current.step ?? null, next_action: current.next_action ?? null }, ...rest].slice(0, MAX_SUSPENDED)
          : rest,
      },
      events: keepCurrent ? ["workflow_paused", "workflow_resumed"] : ["workflow_resumed"],
    };
  }

  // Nouvelle intention : le parcours long en cours est mis de côté, pas effacé.
  if (RESUMABLE_INTENTS.has(current.intent)) {
    return {
      state: {
        intent: detected,
        collected: [],
        missing: [],
        suspended: [
          { intent: current.intent, step: current.step ?? null, next_action: current.next_action ?? null },
          ...suspended.filter((entry) => entry.intent !== current.intent),
        ].slice(0, MAX_SUSPENDED),
      },
      events: ["workflow_paused", "workflow_started"],
    };
  }

  return {
    state: { intent: detected, collected: [], missing: [], suspended },
    events: ["workflow_started"],
  };
}

/** Lit l'état de workflow d'un contexte de session Clara. */
export function readWorkflow(context: Record<string, unknown> | undefined | null): ClaraWorkflowState | null {
  const raw = context?.workflow;
  if (!raw || typeof raw !== "object") return null;
  const value = raw as ClaraWorkflowState;
  return value.intent ? value : null;
}

/** Enregistre l'état de workflow dans la session canonique (tolérant aux pannes). */
export function rememberWorkflow(state: ClaraWorkflowState): void {
  void saveClaraContext({ workflow: state } as never).catch(() => undefined);
}

/** Journalise un événement de parcours. Aucun secret, aucune donnée privée. */
export function logClaraWorkflowEvent(
  event: ClaraWorkflowEvent,
  details: { intent?: ClaraWorkflowIntent | null; step?: string | null } = {},
): void {
  const token = peekClaraSessionToken();
  if (!token) return;
  void supabase.functions
    .invoke("clara-session", {
      body: {
        action: "event",
        session_token: token,
        event,
        intent: details.intent ?? null,
        step: details.step ?? null,
      },
    })
    .catch(() => undefined);
}
