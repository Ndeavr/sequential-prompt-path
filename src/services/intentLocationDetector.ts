/**
 * intentLocationDetector — Detects service intent and location from free-text queries.
 * Used by HeaderSearch and Alex to avoid redundant questions.
 */

const QUEBEC_CITIES = [
  "montréal", "montreal", "laval", "longueuil", "québec", "quebec", "gatineau",
  "sherbrooke", "lévis", "levis", "trois-rivières", "trois-rivieres", "saguenay",
  "terrebonne", "repentigny", "brossard", "drummondville", "saint-jean-sur-richelieu",
  "châteauguay", "chateauguay", "saint-jérôme", "saint-jerome", "granby", "blainville",
  "saint-hyacinthe", "shawinigan", "dollard-des-ormeaux", "rimouski", "victoriaville",
  "saint-eustache", "mascouche", "boucherville", "val-d'or", "val-dor", "rouyn-noranda",
  "sorel-tracy", "mirabel", "varennes", "candiac", "sainte-thérèse", "sainte-therese",
  "chambly", "la prairie", "saint-constant", "saint-bruno", "beloeil", "mont-royal",
  "verdun", "lachine", "lasalle", "anjou", "outremont", "westmount", "hampstead",
  "côte-saint-luc", "cote-saint-luc", "pointe-claire", "kirkland", "dorval",
  "saint-laurent", "ahuntsic", "villeray", "rosemont", "plateau", "hochelaga",
  "mercier", "rivière-des-prairies", "riviere-des-prairies", "pierrefonds",
  "saint-léonard", "saint-leonard", "montréal-nord", "montreal-nord",
  "île-bizard", "ile-bizard", "sainte-geneviève", "sainte-genevieve",
  "baie-d'urfé", "baie-durfe", "beaconsfield", "senneville",
];

const INTENT_KEYWORDS: Record<string, { key: string; labelFr: string; openingFr: string }> = {
  "plomberie": { key: "plumbing", labelFr: "Plomberie", openingFr: "un besoin en plomberie" },
  "plombier": { key: "plumbing", labelFr: "Plomberie", openingFr: "un besoin en plomberie" },
  "électricien": { key: "electrical", labelFr: "Électricité", openingFr: "un besoin en électricité" },
  "electricien": { key: "electrical", labelFr: "Électricité", openingFr: "un besoin en électricité" },
  "électricité": { key: "electrical", labelFr: "Électricité", openingFr: "un besoin en électricité" },
  "electricite": { key: "electrical", labelFr: "Électricité", openingFr: "un besoin en électricité" },
  "toiture": { key: "roofing", labelFr: "Toiture", openingFr: "un problème de toiture" },
  "toit": { key: "roofing", labelFr: "Toiture", openingFr: "un problème de toiture" },
  "isolation": { key: "insulation", labelFr: "Isolation", openingFr: "un besoin en isolation" },
  "chauffage": { key: "heating", labelFr: "Chauffage", openingFr: "un besoin en chauffage" },
  "thermopompe": { key: "heat_pump", labelFr: "Thermopompe", openingFr: "un besoin de thermopompe" },
  "fondation": { key: "foundation", labelFr: "Fondation", openingFr: "un problème de fondation" },
  "fissure": { key: "foundation", labelFr: "Fondation", openingFr: "un problème de fissures" },
  "drain": { key: "drain", labelFr: "Drain français", openingFr: "un problème de drain" },
  "cuisine": { key: "kitchen", labelFr: "Rénovation cuisine", openingFr: "un projet de rénovation de cuisine" },
  "salle de bain": { key: "bathroom", labelFr: "Salle de bain", openingFr: "un projet de salle de bain" },
  "peinture": { key: "painting", labelFr: "Peinture", openingFr: "un besoin en peinture" },
  "fenêtre": { key: "windows", labelFr: "Fenêtres", openingFr: "un besoin pour vos fenêtres" },
  "fenetre": { key: "windows", labelFr: "Fenêtres", openingFr: "un besoin pour vos fenêtres" },
  "infiltration": { key: "water_infiltration", labelFr: "Infiltration d'eau", openingFr: "un problème d'infiltration d'eau" },
  "humidité": { key: "humidity", labelFr: "Humidité", openingFr: "un problème d'humidité" },
  "humidite": { key: "humidity", labelFr: "Humidité", openingFr: "un problème d'humidité" },
  "notaire": { key: "notary", labelFr: "Notaire", openingFr: "un besoin de notaire" },
  "entrepreneur": { key: "contractor_search", labelFr: "Entrepreneur", openingFr: "un besoin de trouver un entrepreneur" },
  "rénovation": { key: "renovation", labelFr: "Rénovation", openingFr: "un projet de rénovation" },
  "renovation": { key: "renovation", labelFr: "Rénovation", openingFr: "un projet de rénovation" },
};

export interface DetectedIntentLocation {
  intentKey: string | null;
  intentLabel: string | null;
  openingPhrase: string | null;
  city: string | null;
  cityNormalized: string | null;
  confidence: number;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function detectIntentAndLocation(query: string): DetectedIntentLocation {
  const normalized = normalize(query);
  const words = normalized.split(/[\s,]+/);

  // Detect city
  let detectedCity: string | null = null;
  let cityNormalized: string | null = null;
  for (const city of QUEBEC_CITIES) {
    const normalizedCity = normalize(city);
    if (normalized.includes(normalizedCity)) {
      detectedCity = city.charAt(0).toUpperCase() + city.slice(1);
      cityNormalized = normalizedCity;
      break;
    }
  }

  // Detect intent
  let intentKey: string | null = null;
  let intentLabel: string | null = null;
  let openingPhrase: string | null = null;
  for (const [keyword, data] of Object.entries(INTENT_KEYWORDS)) {
    const normalizedKw = normalize(keyword);
    if (normalized.includes(normalizedKw)) {
      intentKey = data.key;
      intentLabel = data.labelFr;
      openingPhrase = data.openingFr;
      break;
    }
  }

  const confidence = (intentKey ? 0.5 : 0) + (detectedCity ? 0.4 : 0) + 0.1;

  return { intentKey, intentLabel, openingPhrase, city: detectedCity, cityNormalized, confidence };
}

/**
 * Build Alex's contextual opening phrase based on detected intent + location.
 */
export function buildAlexOpening(detection: DetectedIntentLocation): string {
  if (detection.openingPhrase && detection.city) {
    return `Je vois que vous avez ${detection.openingPhrase} à ${detection.city}. Je m'en occupe.`;
  }
  if (detection.openingPhrase) {
    return `Je vois que vous avez ${detection.openingPhrase}. Dans quel secteur êtes-vous?`;
  }
  if (detection.city) {
    return `Je prends note de votre secteur : ${detection.city}. Quel est votre besoin?`;
  }
  return "Décrivez-moi votre besoin, je m'en occupe.";
}

// Popular search intents for the search dropdown
export const POPULAR_SEARCH_INTENTS = [
  { key: "roofing_leak", label: "Toiture qui fuit", openingFr: "Je vois que vous avez un problème de toiture qui fuit." },
  { key: "insulation_attic", label: "Isolation grenier", openingFr: "Je vois que vous cherchez à isoler votre grenier." },
  { key: "verify_contractor", label: "Vérifier entrepreneur", openingFr: "Je vois que vous voulez vérifier un entrepreneur. Donnez-moi son nom." },
  { key: "kitchen_renovation", label: "Rénover cuisine", openingFr: "Je vois que vous avez un projet de rénovation de cuisine." },
  { key: "condo_law16", label: "Loi 16 condo", openingFr: "Je vois que vous avez des questions sur la Loi 16 pour votre copropriété." },
] as const;
