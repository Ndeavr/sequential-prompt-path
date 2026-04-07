/**
 * AlexTranscriptNormalizer — Post-STT correction for Quebec French
 * Fixes common misrecognitions: city names, trade terms, phonetic confusions.
 */

// Quebec city phonetic corrections (commonly confused pairs)
const CITY_CORRECTIONS: [RegExp, string][] = [
  [/\bblainville\b/gi, (match) => {
    // Only correct if no prior mention of Blainville in context
    return match; // keep as-is — real correction happens in fuzzy logic below
  }] as any,
  [/\bmontreal\b/gi, "Montréal"],
  [/\bmonreal\b/gi, "Montréal"],
  [/\bmontriel\b/gi, "Montréal"],
  [/\bmontréale?\b/gi, "Montréal"],
  [/\blaval\b/gi, "Laval"],
  [/\blongueuil\b/gi, "Longueuil"],
  [/\blongueil\b/gi, "Longueuil"],
  [/\blong oeil\b/gi, "Longueuil"],
  [/\bquébec\b/gi, "Québec"],
  [/\bquebec\b/gi, "Québec"],
  [/\bgatineau\b/gi, "Gatineau"],
  [/\bsherbrooke?\b/gi, "Sherbrooke"],
  [/\btrois[ -]?rivières?\b/gi, "Trois-Rivières"],
  [/\btrois[ -]?rivieres?\b/gi, "Trois-Rivières"],
  [/\bsaguenay\b/gi, "Saguenay"],
  [/\blévis\b/gi, "Lévis"],
  [/\blevis\b/gi, "Lévis"],
  [/\bterrebonne?\b/gi, "Terrebonne"],
  [/\brepentigny\b/gi, "Repentigny"],
  [/\bsaint[ -]?jérôme\b/gi, "Saint-Jérôme"],
  [/\bsaint[ -]?jerome\b/gi, "Saint-Jérôme"],
  [/\bdrummondville\b/gi, "Drummondville"],
  [/\bgranby\b/gi, "Granby"],
  [/\bsaint[ -]?hyacinthe\b/gi, "Saint-Hyacinthe"],
  [/\brimouski\b/gi, "Rimouski"],
  [/\bvictoriaville\b/gi, "Victoriaville"],
  [/\bshawinigan\b/gi, "Shawinigan"],
  [/\bchâteauguay\b/gi, "Châteauguay"],
  [/\bchateauguay\b/gi, "Châteauguay"],
  [/\bmascouche?\b/gi, "Mascouche"],
  [/\bmirabel\b/gi, "Mirabel"],
  [/\bbrossard\b/gi, "Brossard"],
  [/\bsaint[ -]?laurent\b/gi, "Saint-Laurent"],
  [/\bbeloeil\b/gi, "Beloeil"],
  [/\bsaint[ -]?jean\b/gi, "Saint-Jean"],
  [/\bjoliette?\b/gi, "Joliette"],
];

// Trade term corrections
const TRADE_CORRECTIONS: [RegExp, string][] = [
  [/\bterme? ?pump\b/gi, "thermopompe"],
  [/\bthermopompe?\b/gi, "thermopompe"],
  [/\btermo ?pomp\b/gi, "thermopompe"],
  [/\bfournaise?\b/gi, "fournaise"],
  [/\bfournesse?\b/gi, "fournaise"],
  [/\bplomberie?\b/gi, "plomberie"],
  [/\btoiture?\b/gi, "toiture"],
  [/\bélectricité\b/gi, "électricité"],
  [/\belectricite\b/gi, "électricité"],
  [/\bclimatisation?\b/gi, "climatisation"],
  [/\bisolation?\b/gi, "isolation"],
  [/\bfondation?\b/gi, "fondation"],
  [/\bmoisissure?\b/gi, "moisissure"],
  [/\bhumidité?\b/gi, "humidité"],
  [/\bhumidite\b/gi, "humidité"],
  [/\bsoumission?\b/gi, "soumission"],
  [/\brénovation?\b/gi, "rénovation"],
  [/\brenovation\b/gi, "rénovation"],
];

/**
 * Patterns that indicate internal AI reasoning — MUST be blocked from UI
 */
const INTERNAL_PATTERNS = [
  /\*\*/,
  /^(Thought|Thinking|Processing|Analyzing|Evaluating|Considering)/i,
  /\b(Prioritizing|Refocusing|My focus|I will execute|I'm maintaining|My primary|I must now|My next step|according to my internal|Let me think|Internal note)\b/i,
  /\b(useLiveVoice|onTranscript|console\.log|function\(|import |export |const |let |var )\b/,
  /\bEdited\b.*\bsrc\//i,
  /\bFix\b.*\.(ts|tsx|js)\b/i,
  /```/,
  /^\s*\/\//,
];

/**
 * Returns true if the text is internal reasoning that should NOT be shown/spoken
 */
export function isInternalThinking(text: string): boolean {
  if (!text || text.trim().length === 0) return true;
  return INTERNAL_PATTERNS.some(p => p.test(text));
}

/**
 * Normalize a transcript for Quebec French context
 */
export function normalizeTranscript(text: string): string {
  if (!text) return text;
  let result = text;

  for (const [pattern, replacement] of CITY_CORRECTIONS) {
    if (typeof replacement === 'string') {
      result = result.replace(pattern, replacement);
    }
  }

  for (const [pattern, replacement] of TRADE_CORRECTIONS) {
    result = result.replace(pattern, replacement);
  }

  return result.trim();
}

/**
 * Clean Alex's output before displaying in UI
 */
export function cleanAlexOutput(text: string): string {
  if (!text) return "";
  
  // Remove markdown artifacts
  let clean = text
    .replace(/\*\*([^*]+)\*\*/g, "$1")  // bold
    .replace(/\*([^*]+)\*/g, "$1")       // italic
    .replace(/^#+\s*/gm, "")             // headers
    .replace(/^[-*]\s+/gm, "")           // list items
    .replace(/`([^`]+)`/g, "$1")         // inline code
    .replace(/\n{2,}/g, " ")             // multiple newlines
    .trim();

  return clean;
}
