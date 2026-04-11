/**
 * AlexNeedResolver — Computes next best action from current session state.
 * 
 * RULES:
 * - Never ask for address in entrepreneur plan flow
 * - Never recommend contractor without qualified need
 * - Never show booking without matched contractor
 * - One action per turn, one question per turn
 */

import type { AlexIntent } from "./alexIntentClassifier";
import type { AlexSessionMemory } from "./alexMemoryEngine";
import type { AlexRoute, AlexUIComponent } from "./alexRouteEngine";

export interface NextBestAction {
  action_key: string;
  action_label: string;
  route: AlexRoute;
  component: AlexUIComponent;
  message: string;
  missing_data: string[];
  confidence: number;
}

// ─── PROBLEM → SERVICE MAPPING ───
const PROBLEM_SERVICE_MAP: Record<string, string> = {
  "toiture": "Couvreur",
  "toit": "Couvreur",
  "barrage de glace": "Couvreur / Isolation",
  "glace": "Couvreur / Isolation",
  "plomberie": "Plombier",
  "fuite": "Plombier",
  "drain": "Plombier",
  "chauffage": "Chauffagiste",
  "climatisation": "Climatisation",
  "électricité": "Électricien",
  "peinture": "Peintre",
  "cuisine": "Rénovation cuisine",
  "salle de bain": "Rénovation salle de bain",
  "fondation": "Fondation",
  "isolation": "Isolation",
  "humidité": "Inspection / Décontamination",
  "moisissure": "Décontamination",
  "fenêtre": "Portes et fenêtres",
  "porte": "Portes et fenêtres",
  "plancher": "Revêtement de sol",
};

export function inferServiceFromProblem(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [keyword, service] of Object.entries(PROBLEM_SERVICE_MAP)) {
    if (lower.includes(keyword)) return service;
  }
  return null;
}

export function computeNextBestAction(
  memory: AlexSessionMemory,
  lastIntent: AlexIntent,
): NextBestAction {
  const missing: string[] = [];

  // ─── ENTREPRENEUR FLOW ───
  if (memory.resolved_role === "entrepreneur" || lastIntent.startsWith("contractor_")) {
    if (!memory.recommended_plan) {
      return {
        action_key: "show_plan_selection",
        action_label: "Choisir un plan",
        route: "alex/contractor/plan",
        component: "PanelAlexContractorPlanFlow",
        message: "Quel est votre objectif ? Je recommande le meilleur plan pour vous.",
        missing_data: ["plan_selection"],
        confidence: 0.9,
      };
    }
    if (!memory.plan_checkout_started) {
      return {
        action_key: "start_checkout",
        action_label: "Procéder au paiement",
        route: "alex/contractor/payment",
        component: null,
        message: "Prêt à activer votre plan ? Procédons au paiement.",
        missing_data: [],
        confidence: 0.85,
      };
    }
    return {
      action_key: "contractor_profile",
      action_label: "Compléter profil",
      route: "alex/contractor/profile-builder",
      component: "PanelAlexProfileCompletionPrompt",
      message: "Complétez votre profil pour maximiser votre visibilité.",
      missing_data: [],
      confidence: 0.8,
    };
  }

  // ─── HOMEOWNER FLOW ───

  // Step 1: Need qualification
  if (!memory.need_qualified) {
    missing.push("need_description");
    if (!memory.problem_type) missing.push("problem_type");
    return {
      action_key: "qualify_need",
      action_label: "Qualifier le besoin",
      route: "alex/homeowner/problem",
      component: "PanelAlexHomeownerProblemFlow",
      message: memory.problem_type
        ? "Compris. Pouvez-vous me donner plus de détails ?"
        : "Décrivez-moi votre besoin, je m'en occupe.",
      missing_data: missing,
      confidence: 0.7,
    };
  }

  // Step 2: Service identified?
  if (!memory.service_category) {
    return {
      action_key: "identify_service",
      action_label: "Identifier le service",
      route: "alex/homeowner/problem",
      component: "CardAlexMissingData",
      message: "Quel type de travaux recherchez-vous exactement ?",
      missing_data: ["service_category"],
      confidence: 0.7,
    };
  }

  // Step 3: Location (only now!)
  if (!memory.address_known && !memory.city) {
    return {
      action_key: "collect_location",
      action_label: "Obtenir la localisation",
      route: "alex/homeowner/contractor-search",
      component: "PanelAlexAddressCollectionGuarded",
      message: "Dans quelle ville se situe votre propriété ?",
      missing_data: ["city"],
      confidence: 0.8,
    };
  }

  // Step 4: Find contractor
  if (!memory.recommended_contractor_id) {
    return {
      action_key: "find_contractor",
      action_label: "Trouver un professionnel",
      route: "alex/homeowner/contractor-search",
      component: "CardAlexRecommendedContractor",
      message: "Je cherche le meilleur professionnel pour votre projet.",
      missing_data: [],
      confidence: 0.85,
    };
  }

  // Step 5: Book appointment
  if (!memory.booking_confirmed) {
    return {
      action_key: "book_appointment",
      action_label: "Réserver un rendez-vous",
      route: "alex/homeowner/booking",
      component: null,
      message: "Voulez-vous réserver un rendez-vous ?",
      missing_data: [],
      confidence: 0.9,
    };
  }

  // Step 6: Done
  return {
    action_key: "session_complete",
    action_label: "Session terminée",
    route: "alex/idle",
    component: null,
    message: "Votre rendez-vous est confirmé. Vous recevrez une confirmation.",
    missing_data: [],
    confidence: 1.0,
  };
}
