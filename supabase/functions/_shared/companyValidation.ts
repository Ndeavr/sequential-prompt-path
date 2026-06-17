// PROTECTED — UNPRO company-name validation.
// Used by validate-lead-phones and any pre-outreach gate.

export type CompanyFailureReason =
  | "empty_company"
  | "too_short"
  | "category_word_only"
  | "contains_phone"
  | "contains_city_only"
  | "reserved_keyword"
  | "low_confidence"
  | "duplicate_company"
  | null;

export type CompanyClassifyResult = {
  valid: boolean;
  score: number; // 0-100
  reason: CompanyFailureReason;
  normalized: string;
};

const CATEGORY_WORDS = new Set([
  "couvreur", "couvreurs", "toiture", "toitures",
  "plombier", "plombiers", "plomberie",
  "electricien", "électricien", "electriciens", "électriciens", "electricite", "électricité",
  "peintre", "peintres", "peinture",
  "menuisier", "menuisiers", "menuiserie",
  "entrepreneur", "entrepreneurs", "general", "général", "generale", "générale",
  "renovation", "rénovation", "renovations", "rénovations",
  "construction", "constructions",
  "contracteur", "contracteurs",
  "service", "services",
  "inc", "ltee", "ltée", "enr",
]);

const RESERVED_KEYWORDS = new Set([
  "unknown", "n/a", "na", "none", "null", "test", "tbd", "todo", "xxx", "aucun",
]);

const QC_CITIES_HINTS = new Set([
  "montreal", "montréal", "laval", "longueuil", "quebec", "québec",
  "gatineau", "sherbrooke", "trois-rivieres", "trois-rivières", "saguenay",
  "levis", "lévis", "terrebonne", "brossard", "saint-jerome", "saint-jérôme",
  "repentigny", "drummondville", "granby", "blainville", "mirabel",
  "rimouski", "saint-hyacinthe", "shawinigan", "boucherville", "victoriaville",
]);

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function looksLikePhone(s: string): boolean {
  const digits = s.replace(/\D/g, "");
  return digits.length >= 7;
}

export function classifyCompany(rawInput: string | null | undefined): CompanyClassifyResult {
  const raw = (rawInput ?? "").toString().trim();
  if (!raw) return { valid: false, score: 0, reason: "empty_company", normalized: "" };
  if (raw.length < 2) return { valid: false, score: 0, reason: "too_short", normalized: raw };

  const norm = normalize(raw);

  if (RESERVED_KEYWORDS.has(norm)) {
    return { valid: false, score: 0, reason: "reserved_keyword", normalized: norm };
  }
  if (looksLikePhone(raw)) {
    return { valid: false, score: 0, reason: "contains_phone", normalized: norm };
  }

  const tokens = norm.split(/[\s\-_,.]+/).filter(Boolean);
  if (tokens.length === 0) {
    return { valid: false, score: 0, reason: "empty_company", normalized: norm };
  }

  // City-only?
  if (tokens.every((t) => QC_CITIES_HINTS.has(t))) {
    return { valid: false, score: 10, reason: "contains_city_only", normalized: norm };
  }

  // All tokens are generic category words?
  const nonCategoryTokens = tokens.filter((t) => !CATEGORY_WORDS.has(t) && !QC_CITIES_HINTS.has(t));
  if (nonCategoryTokens.length === 0) {
    return { valid: false, score: 20, reason: "category_word_only", normalized: norm };
  }

  // Score
  let score = 60;
  if (nonCategoryTokens.length >= 1) score += 15;
  if (nonCategoryTokens.length >= 2) score += 10;
  if (/inc\.?|ltée|ltee|enr\.?/i.test(raw)) score += 10;
  if (raw.length >= 8) score += 5;
  if (/[A-Z][a-z]/.test(raw)) score += 5; // proper-cased
  if (score > 100) score = 100;

  if (score < 70) return { valid: false, score, reason: "low_confidence", normalized: norm };
  return { valid: true, score, reason: null, normalized: norm };
}
