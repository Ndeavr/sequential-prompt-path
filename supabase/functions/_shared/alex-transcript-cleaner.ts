/**
 * Alex Transcript Cleaner — Pre-LLM speech normalization layer.
 * 
 * Cleans raw STT output before sending to AI:
 *   1. Remove filler words (euh, hum, genre, tsé, etc.)
 *   2. Fix common phonetic transcription errors
 *   3. Normalize Quebec French terms
 *   4. Extract high-confidence keywords for intent boosting
 * 
 * Pure function — no side effects, no network calls.
 */

// ─── Filler words to strip ───
const FILLER_PATTERNS = [
  /\b(euh|euhhh?|uhh?|umm?|hmm?|hein|tsé|t'sais|faque|fait que|genre|comme|ben|bah|là là|mettons)\b/gi,
  /\b(ok alors|bon ben|ah oui|oh ok)\b/gi,
  // Repeated hesitations
  /\b(je je|le le|un un|de de|la la|les les)\b/gi,
];

// ─── Phonetic error corrections (STT mistakes in Quebec French) ───
const PHONETIC_FIXES: Array<[RegExp, string]> = [
  // Common STT misheard words
  [/\bgrénier\b/gi, "grenier"],
  [/\bentretoi\b/gi, "entretoit"],
  [/\bentre toit\b/gi, "entretoit"],
  [/\bthermopompe?\b/gi, "thermopompe"],
  [/\btermopomp[e]?\b/gi, "thermopompe"],
  [/\bcalfeutrage\b/gi, "calfeutrage"],
  [/\bcalfeutage\b/gi, "calfeutrage"],
  [/\brénoration\b/gi, "rénovation"],
  [/\brennovation\b/gi, "rénovation"],
  [/\bsoumition\b/gi, "soumission"],
  [/\bfournèse\b/gi, "fournaise"],
  [/\bfournaise?\b/gi, "fournaise"],
  [/\bplombri\b/gi, "plomberie"],
  [/\bélectriciter?\b/gi, "électricité"],
  [/\bvermicullite\b/gi, "vermiculite"],
  [/\bvermiculit\b/gi, "vermiculite"],
  [/\bcondeau\b/gi, "condo"],
  [/\bcondominium\b/gi, "condo"],
  [/\bcopropriétaire\b/gi, "copropriétaire"],
  [/\bcoproprété\b/gi, "copropriété"],
  [/\bdrains? française?\b/gi, "drain français"],
  [/\bun pro\b/gi, "UNPRO"],
  [/\bon pro\b/gi, "UNPRO"],
  // City name fixes
  [/\bmontréal?\b/gi, "Montréal"],
  [/\bla val\b/gi, "Laval"],
  [/\blongueil\b/gi, "Longueuil"],
  [/\bterebonne\b/gi, "Terrebonne"],
  [/\brepentiny\b/gi, "Repentigny"],
  [/\bbrausard\b/gi, "Brossard"],
  [/\bsherbrook\b/gi, "Sherbrooke"],
  [/\bsaint jérôme\b/gi, "Saint-Jérôme"],
];

// ─── Keywords for intent boosting ───
const INTENT_KEYWORDS: Record<string, string[]> = {
  isolation: ["froid", "chaud", "température", "isolant", "isolation", "courant d'air", "frette", "gèle", "gelé"],
  ventilation: ["humidité", "moisissure", "moisi", "humide", "condensation", "buée", "odeur"],
  toiture: ["toit", "toiture", "bardeau", "bardeaux", "couvreur", "gouttière", "infiltration"],
  plomberie: ["eau", "fuite", "tuyau", "drain", "robinet", "toilette", "plombier", "plomberie"],
  chauffage: ["chauffage", "thermopompe", "fournaise", "climatisation", "chaleur", "radiateur"],
  electricite: ["électricité", "panne", "panneau", "prise", "courant", "disjoncteur", "fils"],
  fenetre: ["fenêtre", "vitre", "porte", "cadre", "châssis"],
  renovation: ["rénovation", "rénover", "travaux", "agrandir", "transformer"],
  urgence: ["urgent", "urgence", "vite", "rapidement", "immédiat", "tout de suite", "dégât", "dégât d'eau"],
  budget: ["combien", "prix", "coût", "budget", "estimé", "soumission", "devis", "cher"],
  booking: ["rendez-vous", "disponible", "disponibilité", "réserver", "quand", "horaire", "calendrier", "créneau"],
  condo: ["condo", "copropriété", "syndicat", "loi 16", "parties communes", "aires communes"],
};

export interface CleanedTranscript {
  /** Cleaned text for LLM */
  cleaned: string;
  /** Original raw text */
  raw: string;
  /** Detected high-confidence keywords */
  detectedKeywords: string[];
  /** Mapped intent hints from keywords */
  intentHints: string[];
  /** Number of fillers removed */
  fillersRemoved: number;
  /** Number of phonetic fixes applied */
  phoneticFixes: number;
}

/**
 * Clean a raw STT transcript for optimal LLM understanding.
 */
export function cleanTranscript(raw: string): CleanedTranscript {
  if (!raw || !raw.trim()) {
    return { cleaned: "", raw, detectedKeywords: [], intentHints: [], fillersRemoved: 0, phoneticFixes: 0 };
  }

  let text = raw.trim();
  let fillersRemoved = 0;
  let phoneticFixes = 0;

  // 1. Remove fillers
  for (const pattern of FILLER_PATTERNS) {
    const before = text;
    text = text.replace(pattern, " ");
    if (text !== before) fillersRemoved++;
  }

  // 2. Fix phonetic errors
  for (const [pattern, replacement] of PHONETIC_FIXES) {
    const before = text;
    text = text.replace(pattern, replacement);
    if (text !== before) phoneticFixes++;
  }

  // 3. Normalize whitespace
  text = text.replace(/\s{2,}/g, " ").trim();

  // 4. Extract keywords and intent hints
  const lower = text.toLowerCase();
  const detectedKeywords: string[] = [];
  const intentHints: string[] = [];

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw) && !detectedKeywords.includes(kw)) {
        detectedKeywords.push(kw);
        if (!intentHints.includes(intent)) {
          intentHints.push(intent);
        }
      }
    }
  }

  return {
    cleaned: text,
    raw,
    detectedKeywords,
    intentHints,
    fillersRemoved,
    phoneticFixes,
  };
}

/**
 * Quick symptom-to-service mapping for instant intent resolution.
 * Returns null if no strong match.
 */
export function mapSymptomToService(text: string): { service: string; confidence: number } | null {
  const lower = text.toLowerCase();

  const SYMPTOM_MAP: Array<{ patterns: RegExp[]; service: string; confidence: number }> = [
    {
      patterns: [/froid|frette|gèle|courant d'air|perd.*chaleur/],
      service: "isolation",
      confidence: 0.85,
    },
    {
      patterns: [/humide|moisissure|condensation|buée|odeur.*moisi/],
      service: "ventilation",
      confidence: 0.80,
    },
    {
      patterns: [/fuite.*eau|dégât.*eau|inondé|plafond.*coule/],
      service: "plomberie",
      confidence: 0.90,
    },
    {
      patterns: [/toit.*coule|bardeau|infiltration.*toit/],
      service: "toiture",
      confidence: 0.85,
    },
    {
      patterns: [/panne.*courant|pas.*électricité|disjoncteur/],
      service: "electricite",
      confidence: 0.85,
    },
    {
      patterns: [/facture.*élevée|trop.*cher.*chauff|coûte.*chauff/],
      service: "chauffage",
      confidence: 0.75,
    },
    {
      patterns: [/loi.*16|parties.*communes|syndicat/],
      service: "condo_compliance",
      confidence: 0.80,
    },
  ];

  for (const entry of SYMPTOM_MAP) {
    for (const pattern of entry.patterns) {
      if (pattern.test(lower)) {
        return { service: entry.service, confidence: entry.confidence };
      }
    }
  }

  return null;
}
