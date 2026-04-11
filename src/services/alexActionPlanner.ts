/**
 * AlexActionPlanner — Maps user intent + context → actionable render decisions.
 */
import type { InlineCardType } from "@/components/alex-conversation/types";

export type ActionType =
  | "show_form"
  | "suggest_contractors"
  | "book"
  | "checkout"
  | "analyze_photo"
  | "analyze_quote"
  | "before_after"
  | "confirm_address"
  | "complete_profile"
  | "show_gallery"
  | "show_task_progress"
  | "next_best_action"
  | "prefill_preview"
  | "text_only";

export type RenderMode = "inline_card" | "drawer" | "modal";

export interface ActionPlan {
  actionType: ActionType;
  cardType: InlineCardType | null;
  renderMode: RenderMode;
  confirmationRequired: boolean;
  nextBestAction: string | null;
  prefillData: Record<string, string>;
}

interface PlannerContext {
  message: string;
  phase: string;
  isAuthenticated: boolean;
  hasAddress: boolean;
  memory: Record<string, string>;
}

const INTENT_MAP: Array<{
  keywords: string[];
  action: ActionType;
  card: InlineCardType;
  confirm: boolean;
}> = [
  { keywords: ["formulaire", "compléter profil", "mon profil"], action: "show_form", card: "inline_form", confirm: false },
  { keywords: ["entrepreneur", "professionnel", "trouver un pro", "chercher un pro"], action: "suggest_contractors", card: "contractor_picker", confirm: false },
  { keywords: ["rendez-vous", "réserver", "booking", "planifier"], action: "book", card: "booking_scheduler", confirm: true },
  { keywords: ["paiement", "plan", "abonnement", "activer", "checkout"], action: "checkout", card: "checkout_embedded", confirm: true },
  { keywords: ["avant après", "avant/après", "before after", "transformation"], action: "before_after", card: "before_after", confirm: false },
  { keywords: ["adresse", "confirmer adresse", "mon adresse"], action: "confirm_address", card: "address_confirmation", confirm: false },
  { keywords: ["galerie", "photos", "inspirations", "exemples"], action: "show_gallery", card: "image_gallery", confirm: false },
  { keywords: ["étapes", "progrès", "avancement", "progression"], action: "show_task_progress", card: "task_progress", confirm: false },
];

export function planAction(ctx: PlannerContext): ActionPlan {
  const lower = ctx.message.toLowerCase();

  // Match against intent map
  for (const intent of INTENT_MAP) {
    if (intent.keywords.some(k => lower.includes(k))) {
      return {
        actionType: intent.action,
        cardType: intent.card,
        renderMode: "inline_card",
        confirmationRequired: intent.confirm,
        nextBestAction: computeNextBest(intent.action, ctx),
        prefillData: extractPrefill(ctx.memory),
      };
    }
  }

  return {
    actionType: "text_only",
    cardType: null,
    renderMode: "inline_card",
    confirmationRequired: false,
    nextBestAction: null,
    prefillData: {},
  };
}

function computeNextBest(currentAction: ActionType, ctx: PlannerContext): string | null {
  const flow: ActionType[] = ["show_form", "suggest_contractors", "book", "checkout"];
  const idx = flow.indexOf(currentAction);
  if (idx >= 0 && idx < flow.length - 1) {
    return flow[idx + 1];
  }
  if (!ctx.isAuthenticated) return "complete_profile";
  if (!ctx.hasAddress) return "confirm_address";
  return null;
}

function extractPrefill(memory: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  const prefillKeys = ["firstName", "city", "address", "phone", "email", "propertyType", "postalCode"];
  for (const k of prefillKeys) {
    if (memory[k]) result[k] = memory[k];
  }
  return result;
}
