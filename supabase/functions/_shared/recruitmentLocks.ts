/**
 * UNPRO — Verrous de recrutement (fail-closed) pour les cycles de découverte.
 *
 * Règle : tant que recruitment_controls.global_enabled ou
 * autonomous_enqueue_enabled est faux (ou illisible), AUCUN cycle de
 * découverte ne peut consommer d'appel externe payant ni alimenter
 * acquisition_queue. Une fonctionnalité bloquée est préférable à une
 * dépense ou une mise en file non autorisée.
 *
 * Provenance : la valeur transmise par le client (body.trigger_source /
 * body.caller) n'est JAMAIS une preuve d'authentification. Elle n'est
 * utilisée comme indice que lorsque l'appelant est authentifié service.
 */

export interface RecruitmentControlsRow {
  global_enabled?: boolean | null;
  autonomous_enqueue_enabled?: boolean | null;
}

export type RecruitmentLockDecision =
  | { allowed: true; reason: null }
  | { allowed: false; reason: "recruitment_controls_unreadable" | "recruitment_global_disabled" | "autonomous_enqueue_disabled" };

export function evaluateRecruitmentLocks(
  controls: RecruitmentControlsRow | null | undefined,
  readError?: unknown,
): RecruitmentLockDecision {
  if (readError) return { allowed: false, reason: "recruitment_controls_unreadable" };
  if (!controls?.global_enabled) return { allowed: false, reason: "recruitment_global_disabled" };
  if (!controls?.autonomous_enqueue_enabled) return { allowed: false, reason: "autonomous_enqueue_disabled" };
  return { allowed: true, reason: null };
}

/**
 * Provenance de déclenchement dérivée de l'authentification, jamais du corps
 * client seul. Un appelant admin authentifié est toujours "admin_manual" ;
 * un appelant service peut déclarer "cron" (indice accepté car authentifié).
 */
export function resolveTriggerSource(
  callerKind: "service" | "admin",
  clientHint: unknown,
): "cron" | "service" | "admin_manual" {
  if (callerKind === "admin") return "admin_manual";
  return clientHint === "cron" ? "cron" : "service";
}
