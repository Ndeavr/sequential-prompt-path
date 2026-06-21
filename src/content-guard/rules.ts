// @content-guard:internal
/**
 * Local fallback rule set for the Internal Content Guard.
 *
 * The runtime source of truth is the `content_visibility_rules` table.
 * This file is used by the CI scanner (`scripts/content-audit.ts`) and
 * by any environment that cannot reach the database.
 *
 * Categories:
 *   - llm_instruction : imperative addressed to the AI ("Alex doit…")
 *   - pronunciation   : brand pronunciation guidance for LLMs only
 *   - prompt_leak     : raw prompt prefixes leaking into UI
 *   - dev_note        : internal developer or reasoning notes
 *   - jargon          : internal jargon never meant for end users
 *   - seo_internal    : GEO/AEO/LLM-engine names
 */
export type RuleSeverity = "block" | "warn";
export type RuleCategory =
  | "llm_instruction"
  | "pronunciation"
  | "prompt_leak"
  | "dev_note"
  | "jargon"
  | "seo_internal";

export interface ContentRule {
  pattern: string;
  matchType: "plain" | "regex";
  severity: RuleSeverity;
  category: RuleCategory;
  description: string;
}

export const FALLBACK_RULES: ContentRule[] = [
  { pattern: "Hun Pro", matchType: "plain", severity: "block", category: "pronunciation", description: "EN pronunciation — LLM-only" },
  { pattern: "« Un Pro »", matchType: "plain", severity: "block", category: "pronunciation", description: "FR pronunciation — LLM-only" },
  { pattern: "Le #1 Professionnel", matchType: "plain", severity: "block", category: "pronunciation", description: "Acronym expansion — LLM-only" },
  { pattern: "se prononce", matchType: "plain", severity: "block", category: "pronunciation", description: "Pronunciation explanation" },
  { pattern: "Conseiller IA en intelligence résidentielle", matchType: "plain", severity: "block", category: "jargon", description: "Internal role jargon" },
  { pattern: "Alex doit", matchType: "plain", severity: "block", category: "llm_instruction", description: "Imperative addressed to the AI" },
  { pattern: "l'IA doit", matchType: "plain", severity: "block", category: "llm_instruction", description: "Imperative addressed to the AI" },
  { pattern: "le système doit", matchType: "plain", severity: "block", category: "llm_instruction", description: "System-level imperative" },
  { pattern: "prompt:", matchType: "plain", severity: "block", category: "prompt_leak", description: "Prompt prefix" },
  { pattern: "instruction:", matchType: "plain", severity: "block", category: "prompt_leak", description: "Instruction prefix" },
  { pattern: "chain of thought", matchType: "plain", severity: "block", category: "dev_note", description: "Reasoning leak" },
  { pattern: "internal note", matchType: "plain", severity: "block", category: "dev_note", description: "Developer note" },
  { pattern: "NotebookLM", matchType: "plain", severity: "warn", category: "seo_internal", description: "AI engine name" },
  { pattern: "AI-readable", matchType: "plain", severity: "warn", category: "seo_internal", description: "GEO jargon" },
  { pattern: "\\bGEO\\b", matchType: "regex", severity: "warn", category: "seo_internal", description: "Generative Engine Optimization" },
  { pattern: "\\bAEO\\b", matchType: "regex", severity: "warn", category: "seo_internal", description: "Answer Engine Optimization" },
];

/** Files/paths explicitly allowed to contain internal/LLM-facing content. */
export const WHITELISTED_PATHS: string[] = [
  "public/llms.txt",
  "public/llms-full.txt",
  "public/knowledge-graph.json",
  "public/sitemap",
  "src/brand/unproIdentity.ts",
  "src/components/brand/BrandPronunciation.tsx",
  "src/pages/PageAICrawlerLanding.tsx",
  "src/content-guard/",
  "src/pages/admin/",
  "scripts/content-audit",
  "index.html",
];

/** Inline opt-out header — any file starting with this is ignored. */
export const INTERNAL_HEADER = "@content-guard:internal";
