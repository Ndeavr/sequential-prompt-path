/**
 * Alex Opening Templates — single source of truth for Alex's first line.
 *
 * Alex is NOT a chatbot. Alex is a Home Project Orchestrator.
 * Openings always commit to an outcome the user is trying to reach,
 * never "Je peux vous aider avec {sujet}".
 *
 * Edit only with product approval.
 */

export type AlexIntent =
  | "renovation"
  | "repair"
  | "emergency"
  | "comparison"
  | "contractor"
  | "generic";

export type AlexRole = "homeowner" | "contractor" | "condo_manager";

const FORBIDDEN_SUBSTRINGS = [
  "Je peux vous aider avec",
  "Je peux définitivement vous aider avec",
  "Je peux vous assister avec",
  "Dites-m'en plus sur ce sujet",
];

/** Stable normalization for keyword matching (accent + case insensitive). */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const KW_EMERGENCY = [
  "urgent",
  "urgence",
  "inondation",
  "fuite majeure",
  "degat d'eau",
  "degat eau",
  "gaz",
  "feu",
  "incendie",
  "panne chauffage",
  "pas de chauffage",
];

const KW_RENOVATION = [
  "renov",
  "refaire",
  "transformer",
  "agrandir",
  "agrandissement",
  "projet",
  "realiser",
  "cuisine",
  "salle de bain",
  "sous-sol",
  "subvention",
  "estimer un cout",
  "estimer",
];

const KW_REPAIR = [
  "probleme",
  "reparer",
  "brise",
  "ne fonctionne",
  "ne demarre",
  "bruit",
  "fuite",
  "thermopompe",
  "chauffe-eau",
  "comprendre",
  "photo",
  "diagnostic",
];

const KW_COMPARISON = [
  "comparer",
  "soumission",
  "devis",
  "options",
  "analyser une soumission",
  "comparaison",
];

export function detectAlexIntent(
  hint?: string | null,
  feature?: string | null,
  role?: AlexRole | null,
): AlexIntent {
  if (role === "contractor") return "contractor";
  const f = (feature ?? "").toLowerCase();
  if (f.startsWith("contractor_") || f.startsWith("pro_") || f.startsWith("entrepreneur_")) {
    return "contractor";
  }
  const h = hint ? normalize(hint) : "";
  if (!h) return "generic";
  if (KW_EMERGENCY.some((k) => h.includes(k))) return "emergency";
  if (KW_COMPARISON.some((k) => h.includes(k))) return "comparison";
  if (KW_RENOVATION.some((k) => h.includes(k))) return "renovation";
  if (KW_REPAIR.some((k) => h.includes(k))) return "repair";
  return "generic";
}

interface OpeningArgs {
  firstName?: string | null;
  role?: AlexRole | null;
  intent?: AlexIntent;
  hint?: string | null;
  feature?: string | null;
}

/**
 * Builds Alex's opening line. Always outcome-oriented.
 * Never produces the forbidden chatbot phrases.
 */
export function buildAlexOpening(args: OpeningArgs = {}): string {
  const { firstName, role, hint, feature } = args;
  const intent: AlexIntent =
    args.intent ?? detectAlexIntent(hint, feature, role);

  const name = (firstName ?? "").trim();
  const salutation = name ? `Bonjour ${name}.` : "Bonjour.";

  let body: string;
  switch (intent) {
    case "renovation":
      body =
        "Je vais vous aider à évaluer votre projet et à trouver le bon entrepreneur pour ce type de travaux. Que souhaitez-vous réaliser ?";
      break;
    case "repair":
      body =
        "Je vais vous aider à comprendre le problème et à déterminer la meilleure marche à suivre. Que remarquez-vous exactement ?";
      break;
    case "emergency":
      body =
        "Je vais vous aider à évaluer rapidement la situation et à trouver le bon professionnel. Que se passe-t-il ?";
      break;
    case "comparison":
      body =
        "Je vais analyser les options avec vous et vous aider à prendre une décision éclairée. Expliquez-moi votre situation.";
      break;
    case "contractor":
      body =
        "Je vais vous aider à développer votre visibilité et à être recommandé aux bons propriétaires. Comment puis-je vous aider aujourd'hui ?";
      break;
    case "generic":
    default:
      body =
        "Je vais vous aider à comprendre votre situation et à trouver le bon professionnel si nécessaire. Que se passe-t-il ?";
      break;
  }

  const out = `${salutation} ${body}`;
  assertNoForbiddenOpening(out);
  return out;
}

/**
 * Dev-only guard: ensures no opening line drifts back into chatbot copy.
 * In production it logs and returns silently to avoid breaking voice.
 */
export function assertNoForbiddenOpening(text: string): void {
  for (const bad of FORBIDDEN_SUBSTRINGS) {
    if (text.includes(bad)) {
      const msg = `[alexOpeningTemplates] Forbidden opening phrase detected: "${bad}" in "${text}"`;
      if (import.meta.env?.DEV) throw new Error(msg);
      // eslint-disable-next-line no-console
      console.error(msg);
    }
  }
}
