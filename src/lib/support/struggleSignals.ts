export type HumanHelpReason =
  | "repeated_validation_errors"
  | "repeated_click_without_progress"
  | "repeated_step_navigation"
  | "important_step_abandoned"
  | "clara_question_unanswered"
  | "payment_blocked"
  | "profile_blocked"
  | "calendar_blocked"
  | "activation_blocked";

export interface HumanHelpSignalDetail {
  reason: HumanHelpReason;
  critical?: boolean;
}

export const HUMAN_HELP_SIGNAL_EVENT = "unpro:human-help-signal";

export function reportStuckSignal(reason: HumanHelpReason, critical = false) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<HumanHelpSignalDetail>(HUMAN_HELP_SIGNAL_EVENT, {
    detail: { reason, critical },
  }));
}