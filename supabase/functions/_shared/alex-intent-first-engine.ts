/**
 * Alex Intent-First Engine — Instant symptom→action resolution.
 * 
 * Maps user input to a concrete interpretation before asking questions.
 * Follows "Confirmation by Interpretation" pattern:
 *   ❌ "Pouvez-vous préciser?"
 *   ✅ "Vous perdez de la chaleur par l'entretoit. C'est bien ça?"
 * 
 * Pure function — used both client-side and in edge functions.
 */

export interface IntentFirstResult {
  /** The interpreted service/problem */
  interpretedService: string | null;
  /** Confirmation question (interpretation, not open-ended) */
  confirmationQuestion: string | null;
  /** Urgency level 0-1 */
  urgency: number;
  /** Whether Alex should act immediately (skip clarification) */
  actNow: boolean;
  /** Specific next step */
  nextStep: "confirm_interpretation" | "estimate" | "match" | "book" | "clarify_with_options";
}

interface SymptomMapping {
  patterns: RegExp[];
  service: string | null;
  interpretation: string;
  confirmation: string;
  urgency: number;
  actNow: boolean;
}

const SYMPTOM_MAPPINGS: SymptomMapping[] = [
  // Cold / Heat loss
  {
    patterns: [/froid|frette|gèle|courant d'air|perd.*chaleur|glacial/i],
    service: "isolation",
    interpretation: "perte de chaleur",
    confirmation: "Vous perdez probablement de la chaleur par l'entretoit ou les fenêtres. C'est bien ça?",
    urgency: 0.5,
    actNow: false,
  },
  // Humidity / Mold
  {
    patterns: [/humide|moisissure|moisi|condensation|buée|senteur/i],
    service: "ventilation",
    interpretation: "problème d'humidité ou de ventilation",
    confirmation: "Vous avez un problème d'humidité, probablement lié à la ventilation. Je regarde ça.",
    urgency: 0.6,
    actNow: false,
  },
  // Water damage
  {
    patterns: [/fuite|dégât.*eau|inondé|coule|eau.*plafond|eau.*sous-sol/i],
    service: "plomberie",
    interpretation: "fuite ou dégât d'eau",
    confirmation: "Un dégât d'eau, ça ne peut pas attendre. Je cherche un plombier disponible maintenant.",
    urgency: 0.95,
    actNow: true,
  },
  // Roof
  {
    patterns: [/toit|toiture|bardeau|infiltration|gouttière/i],
    service: "toiture",
    interpretation: "problème de toiture",
    confirmation: "Un problème de toiture. Je vérifie les couvreurs disponibles dans votre secteur.",
    urgency: 0.7,
    actNow: false,
  },
  // Electrical
  {
    patterns: [/panne|électri|disjoncteur|courant|prise.*morte/i],
    service: "electricite",
    interpretation: "problème électrique",
    confirmation: "Un problème électrique. C'est un panneau, une prise, ou une panne générale?",
    urgency: 0.7,
    actNow: false,
  },
  // Heating / HVAC
  {
    patterns: [/chauff|thermopompe|fournaise|climatisation|chaleur|radiateur/i],
    service: "chauffage",
    interpretation: "chauffage ou climatisation",
    confirmation: "C'est votre système de chauffage. Thermopompe, fournaise, ou autre chose?",
    urgency: 0.5,
    actNow: false,
  },
  // High bills
  {
    patterns: [/facture.*élevée|facture.*cher|coûte.*cher|trop.*payer|hydro/i],
    service: "efficacite_energetique",
    interpretation: "factures d'énergie élevées",
    confirmation: "Des factures trop élevées, c'est souvent l'isolation ou le chauffage. Je fais une évaluation rapide.",
    urgency: 0.3,
    actNow: false,
  },
  // Moving
  {
    patterns: [/déménag|emménag|nouvelle maison|vien.*acheter/i],
    service: "inspection_pre_achat",
    interpretation: "déménagement ou nouvel achat",
    confirmation: "Vous emménagez dans un nouveau chez-vous. Je peux évaluer l'état de la propriété.",
    urgency: 0.3,
    actNow: false,
  },
  // Condo / Loi 16
  {
    patterns: [/condo|copropriété|syndicat|loi.*16|parties.*communes|aires.*communes/i],
    service: "condo_management",
    interpretation: "gestion de copropriété",
    confirmation: "C'est pour votre copropriété. Entretien préventif, urgence, ou conformité Loi 16?",
    urgency: 0.4,
    actNow: false,
  },
  // Unknown / Can't describe
  {
    patterns: [/sais pas|pas sûr|je sais pas|aucune idée|pas certain/i],
    service: null,
    interpretation: "besoin non identifié",
    confirmation: "Pas de souci. Décrivez ce que vous voyez ou ressentez, et je m'en occupe.",
    urgency: 0.2,
    actNow: false,
  },
  // Explicit booking
  {
    patterns: [/rendez-vous|réserver|disponib|créneau|quand.*venir/i],
    service: "booking",
    interpretation: "demande de rendez-vous",
    confirmation: "Je cherche les prochains créneaux disponibles.",
    urgency: 0.8,
    actNow: true,
  },
];

/**
 * Resolve intent from raw/cleaned user input.
 * Returns an interpretation + confirmation question (never open-ended).
 */
export function resolveIntentFirst(text: string): IntentFirstResult {
  const lower = text.toLowerCase().trim();

  if (!lower) {
    return {
      interpretedService: null,
      confirmationQuestion: null,
      urgency: 0,
      actNow: false,
      nextStep: "clarify_with_options",
    };
  }

  for (const mapping of SYMPTOM_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(lower)) {
        return {
          interpretedService: mapping.service,
          confirmationQuestion: mapping.confirmation,
          urgency: mapping.urgency,
          actNow: mapping.actNow,
          nextStep: mapping.actNow ? "match" : "confirm_interpretation",
        };
      }
    }
  }

  // No match — offer binary choice, never open-ended
  return {
    interpretedService: null,
    confirmationQuestion: "Vous parlez d'un problème d'isolation ou de chauffage?",
    urgency: 0,
    actNow: false,
    nextStep: "clarify_with_options",
  };
}

/**
 * Build a context-enriched prompt hint for the LLM based on intent resolution.
 */
export function buildIntentContext(result: IntentFirstResult, keywords: string[]): string {
  const parts: string[] = [];

  if (result.interpretedService) {
    parts.push(`SERVICE DÉTECTÉ: ${result.interpretedService}`);
  }
  if (result.urgency > 0.7) {
    parts.push("URGENCE: élevée — agir immédiatement");
  }
  if (result.actNow) {
    parts.push("MODE: action immédiate — ne pas poser de question, chercher un professionnel");
  }
  if (keywords.length > 0) {
    parts.push(`MOTS-CLÉS: ${keywords.join(", ")}`);
  }
  if (result.nextStep === "confirm_interpretation" && result.confirmationQuestion) {
    parts.push(`SUGGESTION DE RÉPONSE: "${result.confirmationQuestion}"`);
  }

  return parts.length > 0 ? `\n[INTENT CONTEXT]\n${parts.join("\n")}` : "";
}
