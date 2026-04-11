/**
 * AlexRouteEngine — Strict deterministic routing based on intent + role + memory.
 * 
 * RULES:
 * - Each route has its own component set
 * - NEVER show address collection in entrepreneur plan flow
 * - NEVER show contractor recommendation without qualified need + service
 * - NEVER show booking without: valid intent + matched contractor + confirmed slot
 */

import type { AlexIntent } from "./alexIntentClassifier";
import type { AlexSessionMemory } from "./alexMemoryEngine";

export type AlexRoute =
  | "alex/homeowner/problem"
  | "alex/homeowner/quotes"
  | "alex/homeowner/contractor-search"
  | "alex/homeowner/booking"
  | "alex/homeowner/profile-completion"
  | "alex/contractor/plan"
  | "alex/contractor/profile-builder"
  | "alex/contractor/import-card"
  | "alex/contractor/payment"
  | "alex/clarification"
  | "alex/greeting"
  | "alex/idle";

export type AlexUIComponent =
  | "CardAlexNeedIdentified"
  | "CardAlexMissingData"
  | "CardAlexNextBestAction"
  | "CardAlexRecommendedContractor"
  | "CardAlexRecommendedPlan"
  | "PanelAlexHomeownerProblemFlow"
  | "PanelAlexContractorPlanFlow"
  | "PanelAlexAddressCollectionGuarded"
  | "PanelAlexProfileCompletionPrompt"
  | "ModalAlexClarificationRequired"
  | null;

export interface RouteDecision {
  route: AlexRoute;
  component: AlexUIComponent;
  message: string;
  violations: string[];
}

// ─── PRECONDITION CHECKS ───

function canShowContractorRecommendation(mem: AlexSessionMemory): boolean {
  return (
    mem.need_qualified &&
    !!mem.service_category &&
    (mem.address_known || !!mem.city) &&
    mem.resolved_role !== "entrepreneur"
  );
}

function canShowBooking(mem: AlexSessionMemory): boolean {
  return (
    canShowContractorRecommendation(mem) &&
    !!mem.recommended_contractor_id
  );
}

function canShowCheckout(mem: AlexSessionMemory): boolean {
  return (
    mem.resolved_role === "entrepreneur" &&
    !!mem.recommended_plan
  );
}

// ─── VIOLATION DETECTOR ───

function detectViolations(route: AlexRoute, mem: AlexSessionMemory): string[] {
  const violations: string[] = [];

  if (route === "alex/homeowner/contractor-search" && !mem.need_qualified) {
    violations.push("CONTRACTOR_SEARCH_WITHOUT_QUALIFIED_NEED");
  }
  if (route === "alex/homeowner/contractor-search" && !mem.service_category) {
    violations.push("CONTRACTOR_SEARCH_WITHOUT_SERVICE");
  }
  if (route === "alex/homeowner/booking" && !mem.recommended_contractor_id) {
    violations.push("BOOKING_WITHOUT_MATCHED_CONTRACTOR");
  }
  if (route === "alex/contractor/plan" && mem.current_route === "alex/homeowner/problem") {
    violations.push("PLAN_ROUTE_FROM_HOMEOWNER_CONTEXT");
  }

  return violations;
}

// ─── MAIN ROUTING FUNCTION ───

export function resolveRoute(
  intent: AlexIntent,
  memory: AlexSessionMemory,
): RouteDecision {
  const violations: string[] = [];

  // ─── ENTREPRENEUR INTENTS → entrepreneur routes ───
  if (intent === "contractor_choose_plan" || intent === "contractor_join_platform") {
    return {
      route: "alex/contractor/plan",
      component: "PanelAlexContractorPlanFlow",
      message: "Parfait. Quel est votre objectif principal ? Je vous recommande le meilleur plan.",
      violations: detectViolations("alex/contractor/plan", memory),
    };
  }

  if (intent === "contractor_visibility_score" || intent === "contractor_revenue_projection") {
    return {
      route: "alex/contractor/plan",
      component: "CardAlexRecommendedPlan",
      message: "Je calcule votre potentiel. Voici votre analyse.",
      violations: [],
    };
  }

  if (intent === "contractor_build_profile" || intent === "contractor_import_business_card") {
    return {
      route: "alex/contractor/profile-builder",
      component: "PanelAlexProfileCompletionPrompt",
      message: "Construisons votre profil professionnel.",
      violations: [],
    };
  }

  if (intent === "contractor_payment_checkout") {
    if (!canShowCheckout(memory)) {
      return {
        route: "alex/contractor/plan",
        component: "PanelAlexContractorPlanFlow",
        message: "D'abord, choisissons le bon plan pour vous.",
        violations: ["CHECKOUT_WITHOUT_PLAN_SELECTION"],
      };
    }
    return {
      route: "alex/contractor/payment",
      component: null,
      message: "Procédons au paiement.",
      violations: [],
    };
  }

  // ─── HOMEOWNER INTENTS ───

  if (intent === "homeowner_problem_diagnosis") {
    return {
      route: "alex/homeowner/problem",
      component: "PanelAlexHomeownerProblemFlow",
      message: memory.need_qualified
        ? "Compris. Je cherche le meilleur professionnel pour votre besoin."
        : "Pouvez-vous me donner plus de détails sur votre problème ?",
      violations: [],
    };
  }

  if (intent === "homeowner_compare_quotes") {
    return {
      route: "alex/homeowner/quotes",
      component: null,
      message: "Je vais vous guider vers l'analyse comparative de vos soumissions.",
      violations: [],
    };
  }

  if (intent === "homeowner_find_contractor") {
    if (!memory.need_qualified || !memory.service_category) {
      return {
        route: "alex/homeowner/problem",
        component: "CardAlexMissingData",
        message: "Pour trouver le bon professionnel, j'ai besoin de comprendre votre besoin. Quel type de travaux recherchez-vous ?",
        violations: detectViolations("alex/homeowner/contractor-search", memory),
      };
    }
    if (!memory.address_known && !memory.city) {
      return {
        route: "alex/homeowner/contractor-search",
        component: "PanelAlexAddressCollectionGuarded",
        message: "Dans quelle ville se situe votre propriété ? J'en ai besoin pour trouver un professionnel près de chez vous.",
        violations: [],
      };
    }
    return {
      route: "alex/homeowner/contractor-search",
      component: "CardAlexRecommendedContractor",
      message: "Voici le professionnel recommandé pour votre projet.",
      violations: [],
    };
  }

  if (intent === "homeowner_book_appointment") {
    if (!canShowBooking(memory)) {
      // Redirect to find contractor first
      return resolveRoute("homeowner_find_contractor", memory);
    }
    return {
      route: "alex/homeowner/booking",
      component: null,
      message: "Voici les créneaux disponibles.",
      violations: [],
    };
  }

  if (intent === "homeowner_upload_photo_analysis") {
    return {
      route: "alex/homeowner/problem",
      component: null,
      message: "Envoyez-moi votre photo, j'analyse immédiatement.",
      violations: [],
    };
  }

  if (intent === "homeowner_design_visualization") {
    return {
      route: "alex/homeowner/problem",
      component: null,
      message: "Je génère une visualisation pour votre espace.",
      violations: [],
    };
  }

  if (intent === "homeowner_complete_profile" || intent === "homeowner_add_address") {
    return {
      route: "alex/homeowner/profile-completion",
      component: "PanelAlexProfileCompletionPrompt",
      message: "Complétons votre profil ensemble.",
      violations: [],
    };
  }

  // ─── LOCATION CONTEXT (city alone) ───
  if (intent === "location_context") {
    // RULE: city alone should NEVER trigger contractor recommendation
    if (memory.need_qualified && memory.service_category) {
      // Need is already qualified → use city to advance to match
      return {
        route: "alex/homeowner/contractor-search",
        component: "CardAlexRecommendedContractor",
        message: "Merci. Je cherche le meilleur professionnel dans votre secteur.",
        violations: [],
      };
    }
    // Need NOT qualified → just store city, continue assessment
    return {
      route: memory.current_route as AlexRoute || "alex/homeowner/problem",
      component: "CardAlexMissingData",
      message: "Merci. Quel type de travaux recherchez-vous ?",
      violations: [],
    };
  }

  // ─── GREETING ───
  if (intent === "greeting") {
    return {
      route: "alex/greeting",
      component: null,
      message: "",
      violations: [],
    };
  }

  // ─── CONFIRMATION ───
  if (intent === "confirmation") {
    // Contextual: depends on what was last asked
    return {
      route: memory.current_route as AlexRoute || "alex/idle",
      component: null,
      message: "",
      violations: [],
    };
  }

  // ─── CLARIFICATION NEEDED ───
  return {
    route: "alex/clarification",
    component: "ModalAlexClarificationRequired",
    message: "Cherchez-vous un entrepreneur pour votre propriété, ou souhaitez-vous choisir un plan pour votre entreprise ?",
    violations: [],
  };
}
