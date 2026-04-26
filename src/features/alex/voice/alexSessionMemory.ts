/**
 * alexSessionMemory — Lightweight per-session memory for Alex voice.
 *
 * Captures city, project type, urgency and language from transcripts so Alex
 * never asks the same thing twice. Stored in sessionStorage; survives reload.
 */

const STORAGE_KEY = "unpro:alex:session_memory";

export interface AlexSessionMemory {
  city?: string;
  projectType?: string;
  urgency?: "urgent" | "planned" | null;
  language?: "fr" | "en";
  lastStep?: string;
  updatedAt: number;
}

const QUEBEC_CITIES = [
  "Montréal", "Montreal", "Québec", "Quebec", "Laval", "Longueuil", "Gatineau",
  "Sherbrooke", "Trois-Rivières", "Trois-Rivieres", "Saguenay", "Lévis", "Levis",
  "Brossard", "Repentigny", "Boucherville", "Saint-Jean-sur-Richelieu",
  "Drummondville", "Granby", "Blainville", "Mirabel", "Saint-Jérôme",
  "Châteauguay", "Terrebonne", "Mascouche",
];

const PROJECT_PATTERNS: Array<[RegExp, string]> = [
  [/\b(toiture|toit|fuite|infiltration|bardeau)/i, "toiture"],
  [/\b(humidit|moisi|champignon)/i, "humidité"],
  [/\b(plomb|drain|tuyau|robinet|chauffe-eau)/i, "plomberie"],
  [/\b(électr|panneau|disjoncteur|prise|filage)/i, "électricité"],
  [/\b(rénova|reno|salle de bain|cuisine|sous-sol)/i, "rénovation"],
  [/\b(peintur|teintur)/i, "peinture"],
  [/\b(isolat|uréthane|laine)/i, "isolation"],
  [/\b(fenêtre|porte|patio)/i, "fenestration"],
  [/\b(pelouse|terrain|paysag|aménagement)/i, "paysagement"],
  [/\b(climatisat|fournaise|thermopompe|chauffag)/i, "CVAC"],
];

const URGENCY_PATTERNS = /\b(urgent|tout de suite|maintenant|aujourd'hui|ce soir|demain|inondation|fuite active)/i;
const PLANNED_PATTERNS = /\b(planifi|prévu|prochain|dans (\d+|quelques) (jour|semaine|mois)|été prochain|automne|printemps)/i;

const ENGLISH_PATTERNS = /\b(the|please|can you|i need|help|today|tomorrow|water|leak|roof|kitchen|bathroom)\b/i;
const FRENCH_PATTERNS = /\b(je|une|le|la|les|merci|s'il|vous|avez|projet|maison|besoin)\b/i;

export function loadAlexMemory(): AlexSessionMemory | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AlexSessionMemory;
  } catch {
    return null;
  }
}

export function saveAlexMemory(mem: AlexSessionMemory): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mem));
  } catch {
    /* ignore */
  }
}

export function clearAlexMemory(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Extract structured fields from a raw user utterance. Returns deltas only. */
export function extractAlexMemoryDelta(text: string): Partial<AlexSessionMemory> {
  const delta: Partial<AlexSessionMemory> = {};

  // City
  for (const city of QUEBEC_CITIES) {
    const re = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "i");
    if (re.test(text)) {
      delta.city = city;
      break;
    }
  }

  // Project type
  for (const [re, label] of PROJECT_PATTERNS) {
    if (re.test(text)) {
      delta.projectType = label;
      break;
    }
  }

  // Urgency
  if (URGENCY_PATTERNS.test(text)) delta.urgency = "urgent";
  else if (PLANNED_PATTERNS.test(text)) delta.urgency = "planned";

  // Language
  const fr = (text.match(FRENCH_PATTERNS) || []).length;
  const en = (text.match(ENGLISH_PATTERNS) || []).length;
  if (fr + en > 0) delta.language = en > fr ? "en" : "fr";

  return delta;
}

/** Merge a delta into the stored memory and persist. Returns true if anything changed. */
export function mergeAlexMemory(delta: Partial<AlexSessionMemory>): {
  changed: boolean;
  memory: AlexSessionMemory;
} {
  const current = loadAlexMemory() ?? { updatedAt: Date.now() };
  let changed = false;
  const next: AlexSessionMemory = { ...current };

  for (const [key, value] of Object.entries(delta)) {
    if (value === undefined || value === null) continue;
    if ((next as Record<string, unknown>)[key] !== value) {
      (next as Record<string, unknown>)[key] = value;
      changed = true;
    }
  }

  if (changed) {
    next.updatedAt = Date.now();
    saveAlexMemory(next);
  }

  return { changed, memory: next };
}

/** Build a short context string suitable for sendContextualUpdate / system prompt. */
export function buildMemoryContextHint(mem: AlexSessionMemory | null): string | null {
  if (!mem) return null;
  const parts: string[] = [];
  if (mem.city) parts.push(`Ville : ${mem.city}`);
  if (mem.projectType) parts.push(`Projet : ${mem.projectType}`);
  if (mem.urgency === "urgent") parts.push("Urgence : oui");
  if (mem.urgency === "planned") parts.push("Urgence : non, planifié");
  if (parts.length === 0) return null;
  return `Tu reprends une conversation. ${parts.join(" · ")}. Ne redemande pas ces informations.`;
}
