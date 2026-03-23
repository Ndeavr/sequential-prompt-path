/**
 * UNPRO — Alex Autopilot Engine
 * Evaluates user context and determines the best next action,
 * autopilot mode, and UI actions to trigger.
 */

// ─── Types ───

export type AutopilotMode = "passive" | "guiding" | "assertive" | "urgent";
export type MomentumLevel = "cold" | "warming" | "active" | "ready_to_convert";
export type UserRole = "owner" | "contractor" | "condo" | "admin";

export interface AutopilotInput {
  userId?: string | null;
  role: UserRole;
  firstName?: string | null;
  isReturningUser: boolean;
  currentPage: string;
  visibleSection?: string;
  activePropertyId?: string | null;
  hasScore: boolean;
  hasUploadedPhoto: boolean;
  hasPendingBooking: boolean;
  selectedPlan?: string | null;
  selectedContractorId?: string | null;
  lastTopic?: string | null;
  lastQuestion?: string | null;
  alexMode?: string;
  emotionalHints?: string[];
  sessionHistorySummary?: string;
  frictionSignals: FrictionSignal[];
  intentSignals: IntentSignal[];
}

export interface FrictionSignal {
  type: string;
  weight: number; // 0-1
  detail?: string;
}

export interface IntentSignal {
  type: string;
  confidence: number; // 0-1
  source: string;
}

export interface AutopilotAction {
  type: string;
  target?: string;
  label?: string;
}

export interface AutopilotOutput {
  recommendedAction: string;
  confidenceScore: number;
  autopilotMode: AutopilotMode;
  momentum: MomentumLevel;
  alexText: string;
  uiActions: AutopilotAction[];
  reasoning?: string;
}

// ─── Friction Detection ───

export function detectFriction(input: AutopilotInput): FrictionSignal[] {
  const signals: FrictionSignal[] = [...input.frictionSignals];

  if (input.hasUploadedPhoto && !input.hasScore) {
    signals.push({ type: "photo_no_score", weight: 0.7, detail: "Photo uploaded but no score generated" });
  }
  if (input.hasScore && !input.hasPendingBooking && !input.selectedContractorId) {
    signals.push({ type: "score_no_action", weight: 0.6, detail: "Score seen but no next step taken" });
  }
  if (input.hasPendingBooking && input.isReturningUser) {
    signals.push({ type: "incomplete_booking", weight: 0.8, detail: "Started booking but not completed" });
  }
  if (input.currentPage.includes("pricing") && !input.selectedPlan) {
    signals.push({ type: "pricing_no_selection", weight: 0.5, detail: "Viewed pricing without selecting" });
  }

  return signals;
}

// ─── Momentum Scoring ───

export function calculateMomentum(input: AutopilotInput): MomentumLevel {
  let score = 0;

  if (input.isReturningUser) score += 15;
  if (input.hasUploadedPhoto) score += 25;
  if (input.hasScore) score += 20;
  if (input.hasPendingBooking) score += 30;
  if (input.selectedPlan) score += 20;
  if (input.selectedContractorId) score += 15;
  if (input.intentSignals.length > 0) {
    score += Math.min(20, input.intentSignals.reduce((s, i) => s + i.confidence * 10, 0));
  }

  if (score >= 70) return "ready_to_convert";
  if (score >= 45) return "active";
  if (score >= 20) return "warming";
  return "cold";
}

// ─── Mode Selection ───

export function selectMode(
  momentum: MomentumLevel,
  frictionSignals: FrictionSignal[],
  emotionalHints: string[]
): AutopilotMode {
  const hasUrgency = emotionalHints.some(h =>
    ["urgent", "emergency", "leak", "damage", "flood", "fire"].includes(h)
  );
  if (hasUrgency) return "urgent";

  const frictionWeight = frictionSignals.reduce((s, f) => s + f.weight, 0);

  if (momentum === "ready_to_convert") return "assertive";
  if (momentum === "active" && frictionWeight > 1.0) return "guiding";
  if (momentum === "active") return "assertive";
  if (momentum === "warming") return "guiding";
  return "passive";
}

// ─── Next Best Action (deterministic fallback) ───

interface ActionCandidate {
  action: string;
  score: number;
  text: string;
  uiActions: AutopilotAction[];
}

function getOwnerCandidates(input: AutopilotInput): ActionCandidate[] {
  const candidates: ActionCandidate[] = [];
  const name = input.firstName ? ` ${input.firstName}` : "";

  if (!input.hasUploadedPhoto) {
    candidates.push({
      action: "upload_photo",
      score: 90,
      text: `Le plus utile là${name}, c'est une photo. Tu veux que je l'ouvre ?`,
      uiActions: [{ type: "open_upload" }],
    });
  }
  if (input.hasUploadedPhoto && !input.hasScore) {
    candidates.push({
      action: "show_score",
      score: 85,
      text: "Ta photo est là. Je peux générer ton score maintenant.",
      uiActions: [{ type: "show_score" }],
    });
  }
  if (input.hasScore && !input.hasPendingBooking) {
    candidates.push({
      action: "prepare_booking",
      score: 80,
      text: "Ton score est prêt. On prépare un rendez-vous avec le bon pro ?",
      uiActions: [{ type: "open_booking" }],
    });
  }
  if (input.hasScore) {
    candidates.push({
      action: "show_prediction",
      score: 60,
      text: "Je peux te montrer ce qui risque d'arriver si on attend.",
      uiActions: [{ type: "show_prediction" }],
    });
  }
  if (!input.hasUploadedPhoto && !input.hasScore) {
    candidates.push({
      action: "explore",
      score: 30,
      text: "Je peux t'aider à comprendre ta situation. Par où tu veux commencer ?",
      uiActions: [],
    });
  }

  return candidates;
}

function getContractorCandidates(input: AutopilotInput): ActionCandidate[] {
  const candidates: ActionCandidate[] = [];

  if (!input.hasScore) {
    candidates.push({
      action: "show_aipp_score",
      score: 85,
      text: "Ton score AIPP va m'aider à te guider. Tu veux que je te le montre ?",
      uiActions: [{ type: "show_score" }],
    });
  }
  if (!input.selectedPlan) {
    candidates.push({
      action: "recommend_plan",
      score: 80,
      text: "Le meilleur prochain geste, c'est de comparer les plans. Je te montre le bon.",
      uiActions: [{ type: "show_plan_recommendation" }],
    });
  }
  if (input.hasScore && input.selectedPlan) {
    candidates.push({
      action: "explain_roi",
      score: 70,
      text: "Ton plan est choisi. Je peux te montrer le retour estimé.",
      uiActions: [{ type: "navigate", target: "/dashboard/contractor" }],
    });
  }

  return candidates;
}

function getCondoCandidates(input: AutopilotInput): ActionCandidate[] {
  return [
    {
      action: "clarify_role",
      score: 85,
      text: "Il faut clarifier ça d'abord. C'est pour le syndicat ou une unité ?",
      uiActions: [],
    },
    {
      action: "propose_expertise",
      score: 70,
      text: "On peut préparer une expertise ou un vote. Qu'est-ce qui presse le plus ?",
      uiActions: [],
    },
  ];
}

// ─── Main Autopilot Evaluate ───

export function evaluateAutopilot(input: AutopilotInput): AutopilotOutput {
  const frictionSignals = detectFriction(input);
  const momentum = calculateMomentum(input);
  const mode = selectMode(momentum, frictionSignals, input.emotionalHints || []);

  let candidates: ActionCandidate[];
  switch (input.role) {
    case "contractor":
      candidates = getContractorCandidates(input);
      break;
    case "condo":
      candidates = getCondoCandidates(input);
      break;
    default:
      candidates = getOwnerCandidates(input);
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  if (!best) {
    return {
      recommendedAction: "wait",
      confidenceScore: 0.3,
      autopilotMode: "passive",
      momentum,
      alexText: "Je suis là si tu as besoin.",
      uiActions: [],
    };
  }

  // Adjust text based on mode
  let alexText = best.text;
  if (mode === "assertive" && best.action === "upload_photo") {
    alexText = "On va gagner du temps. J'ouvre l'ajout de photo.";
  } else if (mode === "passive" && best.action === "upload_photo") {
    alexText = "Je peux regarder ça avec une photo.";
  }

  return {
    recommendedAction: best.action,
    confidenceScore: best.score / 100,
    autopilotMode: mode,
    momentum,
    alexText,
    uiActions: best.uiActions,
    reasoning: `Mode: ${mode}, Momentum: ${momentum}, Friction: ${frictionSignals.length} signals`,
  };
}
