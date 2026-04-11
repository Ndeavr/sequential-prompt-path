/**
 * AlexIntentClassifier V3 — Deterministic multi-layer intent detection.
 * 
 * RULES:
 * - "Choisir un plan" → contractor_choose_plan, NEVER homeowner search
 * - "Montréal" alone → location_context, NEVER contractor recommendation
 * - Every message → primary_intent + secondary_intent + confidence + requires_clarification
 */

export type AlexIntent =
  // Homeowner intents
  | "homeowner_problem_diagnosis"
  | "homeowner_upload_photo_analysis"
  | "homeowner_compare_quotes"
  | "homeowner_verify_contractor"
  | "homeowner_find_contractor"
  | "homeowner_book_appointment"
  | "homeowner_complete_profile"
  | "homeowner_add_address"
  | "homeowner_design_visualization"
  | "homeowner_condo_request"
  // Entrepreneur intents
  | "contractor_join_platform"
  | "contractor_choose_plan"
  | "contractor_build_profile"
  | "contractor_import_business_card"
  | "contractor_visibility_score"
  | "contractor_revenue_projection"
  | "contractor_payment_checkout"
  | "contractor_booking_settings"
  // Rep/admin intents
  | "rep_build_contractor_profile"
  | "rep_import_business_card"
  | "rep_assign_plan"
  | "admin_override_flow"
  // Ambiguous
  | "ambiguous_need"
  | "needs_clarification"
  | "location_context"
  | "greeting"
  | "confirmation"
  | "unknown";

export interface IntentClassification {
  primary_intent: AlexIntent;
  secondary_intent: AlexIntent | null;
  confidence_score: number;
  requires_clarification: boolean;
  matched_signals: string[];
}

interface IntentRule {
  intent: AlexIntent;
  keywords: string[];
  weight: number;
  excludes?: AlexIntent[]; // If these intents already matched, skip this one
}

// ─── INTENT RULES (ordered by specificity, most specific first) ───
const INTENT_RULES: IntentRule[] = [
  // ─── Entrepreneur intents (HIGH priority to avoid confusion with homeowner) ───
  { intent: "contractor_choose_plan", keywords: [
    "choisir un plan", "choisir mon plan", "quel plan", "quel forfait", "forfait",
    "plan entrepreneur", "plan pro", "m'inscrire", "s'inscrire", "inscription",
    "activer mon plan", "activer mes rendez-vous", "plan premium", "plan essentiel",
    "abonnement", "souscrire", "passer au pro", "devenir pro", "upgrade",
  ], weight: 90 },
  { intent: "contractor_visibility_score", keywords: [
    "mon score", "score aipp", "ma visibilité", "visibilité ia", "mon classement",
    "comment je suis classé", "score entreprise",
  ], weight: 85 },
  { intent: "contractor_revenue_projection", keywords: [
    "revenus potentiels", "manque à gagner", "combien je perds", "projection revenus",
    "potentiel de revenus", "combien de projets",
  ], weight: 85 },
  { intent: "contractor_build_profile", keywords: [
    "compléter mon profil entrepreneur", "profil entreprise", "créer profil pro",
    "bâtir mon profil", "configurer mon profil",
  ], weight: 80 },
  { intent: "contractor_payment_checkout", keywords: [
    "paiement", "checkout", "payer", "carte de crédit",
  ], weight: 80 },
  { intent: "contractor_import_business_card", keywords: [
    "carte d'affaires", "business card", "importer carte",
  ], weight: 80 },
  { intent: "contractor_join_platform", keywords: [
    "rejoindre unpro", "devenir partenaire", "inscription entrepreneur",
  ], weight: 75 },
  { intent: "contractor_booking_settings", keywords: [
    "configurer disponibilités", "mes créneaux", "heures d'ouverture",
  ], weight: 75 },

  // ─── Homeowner intents ───
  { intent: "homeowner_problem_diagnosis", keywords: [
    "problème", "fuite", "brisé", "cassé", "urgence", "urgent", "réparation",
    "humidité", "moisissure", "barrage de glace", "glace sur le toit",
    "infiltration", "dégât d'eau", "toit qui coule", "drain bouché",
    "chauffage ne fonctionne", "pas de chauffage", "pas d'eau chaude",
    "fenêtre brisée", "porte brisée", "fondation fissurée",
  ], weight: 70 },
  { intent: "homeowner_upload_photo_analysis", keywords: [
    "photo", "envoyer photo", "téléverser photo", "analyser photo",
    "regarder cette photo", "voici une photo", "image",
  ], weight: 70 },
  { intent: "homeowner_compare_quotes", keywords: [
    "comparer soumissions", "analyser soumission", "comparer prix",
    "3 soumissions", "laquelle choisir", "meilleure soumission",
    "analyse comparative",
  ], weight: 75 },
  { intent: "homeowner_find_contractor", keywords: [
    "trouver un pro", "chercher un professionnel", "trouver entrepreneur",
    "recommander un pro", "besoin d'un entrepreneur", "qui peut faire",
  ], weight: 65 },
  { intent: "homeowner_book_appointment", keywords: [
    "réserver", "rendez-vous", "planifier", "disponibilité", "créneau",
    "prendre rendez-vous", "quand est-il disponible",
  ], weight: 70 },
  { intent: "homeowner_design_visualization", keywords: [
    "avant après", "avant/après", "transformation", "design",
    "inspirations", "visualiser", "rénover ma cuisine", "refaire ma salle de bain",
  ], weight: 65 },
  { intent: "homeowner_complete_profile", keywords: [
    "compléter mon profil", "mon profil", "mettre à jour profil",
  ], weight: 60 },
  { intent: "homeowner_add_address", keywords: [
    "mon adresse", "confirmer adresse", "ajouter adresse",
  ], weight: 60 },
  { intent: "homeowner_condo_request", keywords: [
    "copropriété", "condo", "syndicat", "loi 16", "fonds de prévoyance",
  ], weight: 70 },
  { intent: "homeowner_verify_contractor", keywords: [
    "vérifier entrepreneur", "est-il fiable", "rbq", "licence",
  ], weight: 65 },

  // ─── Rep/Admin ───
  { intent: "rep_build_contractor_profile", keywords: [
    "créer profil pour", "construire profil entrepreneur",
  ], weight: 85 },
  { intent: "rep_assign_plan", keywords: [
    "assigner plan", "attribuer plan",
  ], weight: 85 },
];

// ─── Cities list (NEVER trigger contractor recommendation alone) ───
const CITIES = [
  "montréal", "montreal", "laval", "québec", "quebec", "gatineau",
  "sherbrooke", "longueuil", "lévis", "levis", "trois-rivières",
  "drummondville", "saint-jean", "rimouski", "saguenay", "terrebonne",
  "repentigny", "brossard", "saint-jérôme", "granby", "blainville",
  "châteauguay", "mascouche", "joliette", "victoriaville",
];

const GREETINGS = ["bonjour", "salut", "hey", "allo", "bonsoir", "coucou"];
const CONFIRMATIONS = ["oui", "ok", "parfait", "d'accord", "correct", "exactement", "c'est bon", "oui parfait"];

export function classifyIntent(
  message: string,
  contextRole?: string,
  sessionHistory?: string[],
): IntentClassification {
  const lower = message.toLowerCase().trim();
  const matched_signals: string[] = [];
  const scores: { intent: AlexIntent; score: number }[] = [];

  // ─── Check greetings ───
  if (GREETINGS.some(g => lower === g || lower.startsWith(g + " "))) {
    return {
      primary_intent: "greeting",
      secondary_intent: null,
      confidence_score: 0.95,
      requires_clarification: false,
      matched_signals: ["greeting"],
    };
  }

  // ─── Check confirmations ───
  if (CONFIRMATIONS.some(c => lower === c || lower === c + ".")) {
    return {
      primary_intent: "confirmation",
      secondary_intent: null,
      confidence_score: 0.95,
      requires_clarification: false,
      matched_signals: ["confirmation"],
    };
  }

  // ─── Score each intent rule ───
  for (const rule of INTENT_RULES) {
    let matches = 0;
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        matches++;
        matched_signals.push(kw);
      }
    }
    if (matches > 0) {
      scores.push({ intent: rule.intent, score: rule.weight * matches });
    }
  }

  // ─── Check if message is ONLY a city name ───
  const isCityOnly = CITIES.some(c => lower === c || lower === c + ".");
  if (isCityOnly && scores.length === 0) {
    return {
      primary_intent: "location_context",
      secondary_intent: null,
      confidence_score: 0.9,
      requires_clarification: false,
      matched_signals: [lower],
    };
  }

  // ─── Sort by score ───
  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    // Context role boost for ambiguous messages
    if (contextRole === "entrepreneur") {
      return {
        primary_intent: "ambiguous_need",
        secondary_intent: "contractor_choose_plan",
        confidence_score: 0.3,
        requires_clarification: true,
        matched_signals,
      };
    }
    return {
      primary_intent: "ambiguous_need",
      secondary_intent: null,
      confidence_score: 0.2,
      requires_clarification: true,
      matched_signals,
    };
  }

  const primary = scores[0];
  const secondary = scores.length > 1 ? scores[1] : null;
  const maxPossible = Math.max(...INTENT_RULES.map(r => r.weight * r.keywords.length));
  const confidence = Math.min(primary.score / maxPossible * 3, 1);

  // ─── CRITICAL GUARD: entrepreneur plan should never trigger homeowner_find_contractor ───
  if (primary.intent === "contractor_choose_plan" && secondary?.intent === "homeowner_find_contractor") {
    return {
      primary_intent: "contractor_choose_plan",
      secondary_intent: null,
      confidence_score: Math.max(confidence, 0.85),
      requires_clarification: false,
      matched_signals,
    };
  }

  return {
    primary_intent: primary.intent,
    secondary_intent: secondary?.intent ?? null,
    confidence_score: confidence,
    requires_clarification: confidence < 0.5,
    matched_signals,
  };
}

// ─── Check if intent is entrepreneur-related ───
export function isEntrepreneurIntent(intent: AlexIntent): boolean {
  return intent.startsWith("contractor_");
}

// ─── Check if intent is homeowner-related ───
export function isHomeownerIntent(intent: AlexIntent): boolean {
  return intent.startsWith("homeowner_");
}

// ─── Check if intent requires qualified need before contractor search ───
export function requiresQualifiedNeed(intent: AlexIntent): boolean {
  return intent === "homeowner_find_contractor" || intent === "homeowner_book_appointment";
}
