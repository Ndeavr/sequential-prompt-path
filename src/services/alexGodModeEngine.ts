/**
 * AlexGodModeEngine — Top-level orchestration layer.
 * Decides which module to activate, which workflow to launch,
 * which task to create, and which agent to trigger.
 * Rule: one dominant workflow at a time.
 */

import type { AutopilotOutput } from "./alexAutopilotEngine";

export type GodDecisionType =
  | "activate_module"
  | "launch_workflow"
  | "create_task"
  | "trigger_agent"
  | "escalate"
  | "wait";

export interface GodModeContext {
  userId: string;
  role: string;
  currentPage: string;
  autopilotOutput?: AutopilotOutput | null;
  hasScore: boolean;
  hasPhoto: boolean;
  hasBooking: boolean;
  hasPlan: boolean;
  hasProfile: boolean;
  trustLevel: number; // 0-100
  frictionLevel: number; // 0-1
  momentum: string;
  sessionHistory: string[];
  activeWorkflow?: string | null;
}

export interface GodDecision {
  type: GodDecisionType;
  target: string;
  reason: string;
  confidence: number; // 0-1
  uiActions: Array<{ type: string; target?: string }>;
  alexText: string;
  priority: number; // 1 = highest
  metadata?: Record<string, unknown>;
}

// ─── Module priority map ───
const MODULE_PRIORITY: Record<string, string[]> = {
  owner: [
    "property_intake",
    "photo_analysis",
    "score_review",
    "contractor_matching",
    "booking_flow",
    "trust_verification",
    "document_management",
    "prediction_review",
  ],
  contractor: [
    "profile_completion",
    "aipp_score",
    "plan_selection",
    "growth_dashboard",
    "lead_management",
    "booking_management",
  ],
  condo: [
    "syndicate_setup",
    "unit_management",
    "vote_preparation",
    "expert_matching",
    "document_management",
  ],
  admin: [
    "ops_dashboard",
    "alert_management",
    "agent_monitoring",
    "growth_tracking",
  ],
};

// ─── Workflow definitions ───
const WORKFLOWS: Record<string, { steps: string[]; description: string }> = {
  homeowner_onboarding: {
    steps: ["intake", "photo", "score", "matching", "booking"],
    description: "Guide propriétaire de l'intake au rendez-vous",
  },
  contractor_activation: {
    steps: ["profile", "aipp", "plan", "payment"],
    description: "Activer un entrepreneur du profil au paiement",
  },
  booking_completion: {
    steps: ["draft", "slots", "confirm", "reminder"],
    description: "Compléter un rendez-vous abandonné",
  },
  trust_verification: {
    steps: ["request_docs", "verify", "badge", "notify"],
    description: "Vérifier et badger un entrepreneur",
  },
  condo_project: {
    steps: ["clarify_scope", "vote_prep", "expert_match", "schedule"],
    description: "Structurer un projet condo",
  },
};

/**
 * Evaluate God Mode — decide what Alex should orchestrate.
 */
export function evaluateGodMode(ctx: GodModeContext): GodDecision {
  // Rule: if there's already an active workflow, continue it
  if (ctx.activeWorkflow && WORKFLOWS[ctx.activeWorkflow]) {
    return {
      type: "launch_workflow",
      target: ctx.activeWorkflow,
      reason: `Workflow actif en cours: ${ctx.activeWorkflow}`,
      confidence: 0.9,
      uiActions: [],
      alexText: "On continue là où on en était.",
      priority: 1,
    };
  }

  // Escalation check
  if (ctx.frictionLevel > 0.8 && ctx.momentum === "cold") {
    return {
      type: "escalate",
      target: "admin_review",
      reason: "Friction critique, utilisateur bloqué",
      confidence: 0.85,
      uiActions: [],
      alexText: "Je note que ça bloque. Je vais transmettre pour qu'on t'aide plus vite.",
      priority: 1,
    };
  }

  // Role-based module selection
  const modules = MODULE_PRIORITY[ctx.role] || MODULE_PRIORITY.owner;
  const bestModule = selectBestModule(ctx, modules);

  if (bestModule) {
    return {
      type: "activate_module",
      target: bestModule.module,
      reason: bestModule.reason,
      confidence: bestModule.confidence,
      uiActions: bestModule.uiActions,
      alexText: bestModule.alexText,
      priority: 2,
    };
  }

  // Default: wait
  return {
    type: "wait",
    target: "none",
    reason: "Pas d'action prioritaire identifiée",
    confidence: 0.3,
    uiActions: [],
    alexText: "Je suis là si tu as besoin.",
    priority: 10,
  };
}

function selectBestModule(
  ctx: GodModeContext,
  modules: string[]
): { module: string; reason: string; confidence: number; uiActions: Array<{ type: string; target?: string }>; alexText: string } | null {
  // Owner logic
  if (ctx.role === "owner") {
    if (!ctx.hasPhoto) {
      return {
        module: "photo_analysis",
        reason: "Pas de photo — étape fondamentale",
        confidence: 0.85,
        uiActions: [{ type: "open_upload" }],
        alexText: "Le plus utile maintenant, c'est une photo.",
      };
    }
    if (!ctx.hasScore) {
      return {
        module: "score_review",
        reason: "Photo sans score",
        confidence: 0.82,
        uiActions: [{ type: "show_score" }],
        alexText: "Ta photo est prête. On génère le score.",
      };
    }
    if (!ctx.hasBooking) {
      return {
        module: "booking_flow",
        reason: "Score sans rendez-vous",
        confidence: 0.78,
        uiActions: [{ type: "open_booking" }],
        alexText: "On prépare un rendez-vous avec le bon pro ?",
      };
    }
  }

  // Contractor logic
  if (ctx.role === "contractor") {
    if (!ctx.hasScore) {
      return {
        module: "aipp_score",
        reason: "Score AIPP manquant",
        confidence: 0.85,
        uiActions: [{ type: "show_score" }],
        alexText: "Ton score AIPP va clarifier ta position.",
      };
    }
    if (!ctx.hasPlan) {
      return {
        module: "plan_selection",
        reason: "Pas de plan sélectionné",
        confidence: 0.8,
        uiActions: [{ type: "show_plan_recommendation" }],
        alexText: "Avec ton score, je peux te montrer le meilleur plan.",
      };
    }
  }

  return null;
}

/**
 * Get workflow steps for a given workflow key.
 */
export function getWorkflowSteps(workflowKey: string) {
  return WORKFLOWS[workflowKey] || null;
}

/**
 * List available workflows.
 */
export function listWorkflows() {
  return Object.entries(WORKFLOWS).map(([key, val]) => ({
    key,
    ...val,
  }));
}
