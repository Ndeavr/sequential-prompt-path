/**
 * Alex Natural Conversation Engine — Core services for response generation,
 * rewriting, guardrails, and pronunciation overrides.
 *
 * Pipeline: generate → rewrite → guard → pronounce → validate → deliver
 */

// ─── Types ──────────────────────────────────────────────────────────
export interface AlexResponseSettings {
  default_language: string;
  max_response_length: number;
  warmth_level: number;
  directness_level: number;
  rewrite_enabled: boolean;
  notebook_style_block_enabled: boolean;
  pronunciation_override_enabled: boolean;
}

export interface ConversationRule {
  id: string;
  rule_key: string;
  rule_label: string;
  rule_description: string | null;
  is_active: boolean;
  severity: "block" | "warn" | "rewrite";
}

export interface BlockedPattern {
  id: string;
  pattern_type: "phrase" | "regex" | "style";
  pattern_text: string;
  severity: "block" | "warn" | "rewrite";
  replacement_strategy: "regenerate" | "rewrite" | "strip";
  is_active: boolean;
}

export interface ResponsePipelineResult {
  rawResponse: string;
  rewrittenResponse: string;
  blockedPatternsDetected: string[];
  rewriteApplied: boolean;
  finalStatus: "delivered" | "rewritten" | "blocked" | "regenerated";
  pronunciationApplied: boolean;
}

// ─── Blocked-Pattern Detection ──────────────────────────────────────
export function detectBlockedPatterns(
  text: string,
  patterns: BlockedPattern[]
): { detected: string[]; severity: "block" | "warn" | "rewrite" | "none" } {
  const detected: string[] = [];
  let worstSeverity: "block" | "warn" | "rewrite" | "none" = "none";
  const severityRank = { block: 3, warn: 1, rewrite: 2, none: 0 };

  for (const p of patterns) {
    if (!p.is_active) continue;
    let matched = false;

    if (p.pattern_type === "phrase") {
      matched = text.toLowerCase().includes(p.pattern_text.toLowerCase());
    } else if (p.pattern_type === "regex") {
      try {
        matched = new RegExp(p.pattern_text, "i").test(text);
      } catch {
        // skip invalid regex
      }
    } else if (p.pattern_type === "style") {
      if (p.pattern_text === "enumeration_list_3plus") {
        const bulletCount = (text.match(/^[\s]*[-•●]\s/gm) || []).length;
        const numberedCount = (text.match(/^\s*\d+[.)]\s/gm) || []).length;
        matched = bulletCount >= 3 || numberedCount >= 3;
      } else if (p.pattern_text === "academic_paragraph") {
        const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
        matched = sentences.length >= 4 && text.length > 500;
      }
    }

    if (matched) {
      detected.push(p.pattern_text);
      if (severityRank[p.severity] > severityRank[worstSeverity]) {
        worstSeverity = p.severity;
      }
    }
  }

  return { detected, severity: worstSeverity };
}

// ─── Strip blocked phrases ──────────────────────────────────────────
export function stripBlockedPhrases(text: string, patterns: BlockedPattern[]): string {
  let result = text;
  for (const p of patterns) {
    if (!p.is_active || p.replacement_strategy !== "strip") continue;
    if (p.pattern_type === "phrase") {
      result = result.replace(new RegExp(escapeRegex(p.pattern_text), "gi"), "");
    } else if (p.pattern_type === "regex") {
      try {
        result = result.replace(new RegExp(p.pattern_text, "gi"), "");
      } catch { /* skip */ }
    }
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Pronunciation Override ─────────────────────────────────────────
const PRONUNCIATION_RULES_FR: [RegExp, string][] = [
  [/\bUNPRO\b/gi, "1 pro"],
  [/\bunpro\b/g, "1 pro"],
];

const PRONUNCIATION_RULES_EN: [RegExp, string][] = [
  [/\bUNPRO\b/gi, "eun pro"],
  [/\bunpro\b/g, "eun pro"],
];

export function applyPronunciationOverride(text: string, lang: string): string {
  const rules = lang.startsWith("en") ? PRONUNCIATION_RULES_EN : PRONUNCIATION_RULES_FR;
  let result = text;
  for (const [pattern, replacement] of rules) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ─── Style quality check ────────────────────────────────────────────
export function checkResponseQuality(text: string, settings: AlexResponseSettings): {
  pass: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (text.length > settings.max_response_length * 3) {
    issues.push("too_long");
  }

  // Check for mechanical listing
  const bulletCount = (text.match(/^[\s]*[-•●]\s/gm) || []).length;
  if (bulletCount >= 4) {
    issues.push("excessive_bullets");
  }

  // Check for academic markers
  const academicMarkers = [
    "en conclusion",
    "il est important de noter",
    "il convient de souligner",
    "par conséquent",
    "en effet",
    "néanmoins",
    "toutefois",
  ];
  for (const m of academicMarkers) {
    if (text.toLowerCase().includes(m)) {
      issues.push(`academic_marker:${m}`);
    }
  }

  return { pass: issues.length === 0, issues };
}

// ─── System prompt builder ──────────────────────────────────────────
export function buildAlexSystemPrompt(
  settings: AlexResponseSettings,
  rules: ConversationRule[],
  userRole: string
): string {
  const activeRules = rules.filter((r) => r.is_active);
  const rulesText = activeRules.map((r) => `- ${r.rule_label}: ${r.rule_description || ""}`).join("\n");

  const roleContext =
    userRole === "contractor"
      ? "Tu parles à un entrepreneur. Focalise-toi sur ses revenus, ses rendez-vous et sa croissance."
      : userRole === "condo_manager"
      ? "Tu parles à un gestionnaire de condo. Sois précis, structuré et axé sur la gestion d'immeuble."
      : "Tu parles à un propriétaire. Sois rassurant, simple et axé sur la solution.";

  return `Tu es Alex, l'assistant IA premium d'UNPRO (prononce "1 pro" en français).
Tu es naturel, direct, chaleureux (niveau ${settings.warmth_level}/10) et orienté action (niveau ${settings.directness_level}/10).

${roleContext}

RÈGLES ABSOLUES:
${rulesText}

STYLE:
- Phrases courtes et percutantes
- Maximum ${settings.max_response_length} caractères
- Jamais de ton robotique ou scolaire
- Jamais de lecture d'extraits de données
- Jamais de style "NotebookLM" (résumés académiques, citations)
- Jamais dire "selon les données", "voici l'extrait", "le document indique"
- Toujours guider vers une action concrète
- Toujours reformuler l'information de manière conversationnelle
- Une idée principale par réponse

FORMAT VOCAL:
- Parle comme un conseiller de confiance au téléphone
- Utilise des transitions naturelles
- Pas de listes à puces sauf si explicitement demandé`;
}

// ─── Full Pipeline (client-side for preview) ────────────────────────
export function runResponsePipeline(
  rawResponse: string,
  settings: AlexResponseSettings,
  rules: ConversationRule[],
  patterns: BlockedPattern[],
  lang: string = "fr"
): ResponsePipelineResult {
  let rewritten = rawResponse;
  let rewriteApplied = false;
  const blockedPatternsDetected: string[] = [];

  // Step 1: Detect blocked patterns
  const detection = detectBlockedPatterns(rawResponse, patterns);
  blockedPatternsDetected.push(...detection.detected);

  // Step 2: Strip if needed
  if (detection.detected.length > 0 && settings.notebook_style_block_enabled) {
    rewritten = stripBlockedPhrases(rewritten, patterns);
    rewriteApplied = true;
  }

  // Step 3: Pronunciation override
  let pronunciationApplied = false;
  if (settings.pronunciation_override_enabled) {
    const before = rewritten;
    rewritten = applyPronunciationOverride(rewritten, lang);
    pronunciationApplied = before !== rewritten;
  }

  // Step 4: Quality check
  const quality = checkResponseQuality(rewritten, settings);

  let finalStatus: ResponsePipelineResult["finalStatus"] = "delivered";
  if (detection.severity === "block") {
    finalStatus = "blocked";
  } else if (rewriteApplied) {
    finalStatus = "rewritten";
  }

  return {
    rawResponse,
    rewrittenResponse: rewritten,
    blockedPatternsDetected,
    rewriteApplied,
    finalStatus,
    pronunciationApplied,
  };
}
