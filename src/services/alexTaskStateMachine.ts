/**
 * AlexTaskStateMachine — Tracks multi-step orchestrated flows.
 */

export type TaskStatus = "pending" | "active" | "done" | "blocked" | "skipped";

export interface TaskStep {
  key: string;
  label: string;
  status: TaskStatus;
  order: number;
}

export interface TaskStack {
  sessionId: string;
  steps: TaskStep[];
  currentStep: number;
}

const DEFAULT_HOMEOWNER_FLOW: Omit<TaskStep, "status">[] = [
  { key: "describe_problem", label: "Décrire le besoin", order: 0 },
  { key: "authenticate", label: "Se connecter", order: 1 },
  { key: "complete_profile", label: "Compléter le profil", order: 2 },
  { key: "confirm_address", label: "Confirmer l'adresse", order: 3 },
  { key: "find_contractor", label: "Trouver un professionnel", order: 4 },
  { key: "book_appointment", label: "Réserver un rendez-vous", order: 5 },
];

const DEFAULT_CONTRACTOR_FLOW: Omit<TaskStep, "status">[] = [
  { key: "set_capacity", label: "Définir la capacité", order: 0 },
  { key: "review_plan", label: "Choisir un plan", order: 1 },
  { key: "complete_profile", label: "Compléter le profil", order: 2 },
  { key: "activate_payment", label: "Activer le paiement", order: 3 },
];

export function createTaskStack(
  sessionId: string,
  flowType: "homeowner" | "contractor" = "homeowner"
): TaskStack {
  const template = flowType === "contractor" ? DEFAULT_CONTRACTOR_FLOW : DEFAULT_HOMEOWNER_FLOW;
  return {
    sessionId,
    steps: template.map((s, i) => ({
      ...s,
      status: i === 0 ? "active" : "pending",
    })),
    currentStep: 0,
  };
}

export function advanceTask(stack: TaskStack, completedKey: string): TaskStack {
  const steps = stack.steps.map(s =>
    s.key === completedKey ? { ...s, status: "done" as TaskStatus } : s
  );

  // Find next pending
  const nextIdx = steps.findIndex(s => s.status === "pending");
  if (nextIdx >= 0) {
    steps[nextIdx] = { ...steps[nextIdx], status: "active" };
  }

  return { ...stack, steps, currentStep: nextIdx >= 0 ? nextIdx : steps.length };
}

export function skipTask(stack: TaskStack, key: string): TaskStack {
  const steps = stack.steps.map(s =>
    s.key === key ? { ...s, status: "skipped" as TaskStatus } : s
  );
  const nextIdx = steps.findIndex(s => s.status === "pending");
  if (nextIdx >= 0) {
    steps[nextIdx] = { ...steps[nextIdx], status: "active" };
  }
  return { ...stack, steps, currentStep: nextIdx >= 0 ? nextIdx : steps.length };
}

export function isFlowComplete(stack: TaskStack): boolean {
  return stack.steps.every(s => s.status === "done" || s.status === "skipped");
}

export function getActiveTask(stack: TaskStack): TaskStep | null {
  return stack.steps.find(s => s.status === "active") || null;
}
