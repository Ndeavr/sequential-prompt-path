/**
 * AlexPronunciationNormalizer — Corrects STT errors and normalizes Alex output
 * for Quebec French. Works on both input (what user said) and output (what Alex says).
 * 
 * This is the comprehensive normalizer that replaces the basic one in alexTranscriptNormalizer.
 */

// ── STT Input Corrections (what the user said, misheard by STT) ──

const STT_CORRECTIONS: [RegExp, string][] = [
  // Critical "ville" fix — STT drops the "v"
  [/\bquelle ille\b/gi, "quelle ville"],
  [/\bdans quelle ille\b/gi, "dans quelle ville"],
  [/\b(\w+) ille\b/gi, (_, prefix) => {
    // Only fix if it looks like a "ville" context
    const villeContextPrefixes = ['quelle', 'la', 'une', 'cette', 'votre', 'notre', 'ma', 'sa'];
    if (villeContextPrefixes.includes(prefix.toLowerCase())) return `${prefix} ville`;
    return `${prefix} ille`; // don't change if not in context
  }],
  // Cities — phonetic confusions
  [/\bmonreal\b/gi, "Montréal"],
  [/\bmontriel\b/gi, "Montréal"],
  [/\bmont réal\b/gi, "Montréal"],
  [/\bmontréale?\b/gi, "Montréal"],
  [/\bmontreal\b/gi, "Montréal"],
  [/\blong ?oeil\b/gi, "Longueuil"],
  [/\blongueil\b/gi, "Longueuil"],
  [/\bbrossare?\b/gi, "Brossard"],
  [/\bbleinville\b/gi, "Blainville"],
  [/\bterre ?bonne\b/gi, "Terrebonne"],
  [/\brepentini\b/gi, "Repentigny"],
  [/\bsaint ?jérome\b/gi, "Saint-Jérôme"],
  [/\bst ?jerome\b/gi, "Saint-Jérôme"],
  [/\bsaint ?jerome\b/gi, "Saint-Jérôme"],
  [/\bquebec\b/gi, "Québec"],
  [/\bgatino\b/gi, "Gatineau"],
  [/\bsherbrook\b/gi, "Sherbrooke"],
  [/\b3 ?rivières\b/gi, "Trois-Rivières"],
  [/\btrois ?rivieres?\b/gi, "Trois-Rivières"],
  [/\bdrummond\b/gi, "Drummondville"],
  [/\bmascouch\b/gi, "Mascouche"],
  [/\bmirrable\b/gi, "Mirabel"],
  [/\bchateau ?guay\b/gi, "Châteauguay"],
  [/\bchateauguay\b/gi, "Châteauguay"],
  [/\blevis\b/gi, "Lévis"],
  
  // Trade terms — phonetic confusions
  [/\brenoration\b/gi, "rénovation"],
  [/\brénoration\b/gi, "rénovation"],
  [/\breno ?ration\b/gi, "rénovation"],
  [/\brenovation\b/gi, "rénovation"],
  [/\bsoumition\b/gi, "soumission"],
  [/\bentre ?toit\b/gi, "entretoit"],
  [/\bentré ?toit\b/gi, "entretoit"],
  [/\bvermi ?culite\b/gi, "vermiculite"],
  [/\bcalori ?fugeage\b/gi, "calorifugeage"],
  [/\bmoisisure\b/gi, "moisissure"],
  [/\bdécontamintion\b/gi, "décontamination"],
  [/\bcoproprieté\b/gi, "copropriété"],
  [/\bcopropriétée\b/gi, "copropriété"],
  [/\bterme? ?pump\b/gi, "thermopompe"],
  [/\btermo ?pomp\b/gi, "thermopompe"],
  [/\bfournesse?\b/gi, "fournaise"],
  [/\bcalfutrage\b/gi, "calfeutrage"],
  [/\belectricite\b/gi, "électricité"],
  [/\bhumidite\b/gi, "humidité"],
];

// ── TTS Output Corrections (what Alex is about to say) ──

const TTS_OUTPUT_FIXES: [RegExp, string][] = [
  // Fix diction errors the model might produce
  [/\bRénoration\b/g, "rénovation"],
  [/\brénoration\b/g, "rénovation"],
  [/\bRenoration\b/g, "rénovation"],
  [/\bsoumition\b/gi, "soumission"],
  [/\bSoumition\b/g, "soumission"],
  [/\bentre toit\b/gi, "entretoit"],
  [/\bEntré toit\b/g, "entretoit"],
  // Acronyms for TTS
  [/\bAIPP\b/g, "A.I.P.P."],
  [/\bRBQ\b/g, "R.B.Q."],
  [/\bCMMTQ\b/g, "C.M.M.T.Q."],
  [/\bCMEQ\b/g, "C.M.E.Q."],
  [/\bUNPRO\b/g, "UnPRO"],
  // Number readability
  [/\b24\/7\b/g, "24 sur 7"],
];

/**
 * Normalize user input transcript (fix STT errors)
 */
export function normalizeUserTranscript(text: string): string {
  if (!text) return text;
  let result = text;
  for (const [pattern, replacement] of STT_CORRECTIONS) {
    result = result.replace(pattern, replacement);
  }
  return result.trim();
}

/**
 * Normalize Alex's output before TTS or display (fix diction)
 */
export function normalizeAlexOutputText(text: string): string {
  if (!text) return text;
  let result = text;
  for (const [pattern, replacement] of TTS_OUTPUT_FIXES) {
    result = result.replace(pattern, replacement);
  }
  // Clean excessive punctuation
  result = result
    .replace(/\.{2,}/g, ".")
    .replace(/\?{2,}/g, "?")
    .replace(/!{2,}/g, "!")
    .replace(/\s+/g, " ");
  return result.trim();
}

/**
 * Full pipeline: clean + normalize for display
 */
export function fullNormalizePipeline(text: string, direction: 'input' | 'output'): string {
  if (direction === 'input') {
    return normalizeUserTranscript(text);
  }
  return normalizeAlexOutputText(text);
}
