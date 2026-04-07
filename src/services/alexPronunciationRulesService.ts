/**
 * AlexPronunciationRulesService — Fetches DB rules and applies them client-side.
 * Caches rules per locale for performance. Used by the voice pipeline.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PronunciationRule {
  id: string;
  rule_name: string | null;
  source_text: string;
  replacement_text: string;
  phonetic_override: string | null;
  locale: string;
  rule_type: string;
  priority: number;
  is_active: boolean;
}

interface RuleCache {
  rules: PronunciationRule[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const ruleCache = new Map<string, RuleCache>();

/**
 * Fetch active pronunciation rules from DB (cached).
 */
export async function fetchPronunciationRules(locale: string = "fr-CA"): Promise<PronunciationRule[]> {
  const cached = ruleCache.get(locale);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rules;
  }

  const { data, error } = await supabase
    .from("alex_voice_pronunciation_rules")
    .select("*")
    .eq("is_active", true)
    .or(`locale.eq.${locale},locale.eq.global`)
    .order("priority", { ascending: false });

  if (error) {
    console.warn("[PronunciationRules] Failed to fetch rules:", error.message);
    return cached?.rules || [];
  }

  const rules = (data || []) as unknown as PronunciationRule[];
  ruleCache.set(locale, { rules, fetchedAt: Date.now() });
  return rules;
}

/**
 * Apply pronunciation rules to text. Returns transformed text.
 * This runs client-side for zero-latency in the voice pipeline.
 */
export function applyPronunciationRules(
  text: string,
  rules: PronunciationRule[]
): { transformed: string; appliedRuleIds: string[] } {
  if (!text || !rules.length) return { transformed: text, appliedRuleIds: [] };

  let result = text;
  const appliedRuleIds: string[] = [];

  for (const rule of rules) {
    const escaped = rule.source_text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");

    if (regex.test(result)) {
      const replacement = rule.phonetic_override || rule.replacement_text;
      result = result.replace(new RegExp(`\\b${escaped}\\b`, "gi"), replacement);
      appliedRuleIds.push(rule.id);
    }
  }

  return { transformed: result, appliedRuleIds };
}

/**
 * Combined: fetch + apply. Convenience for one-shot use.
 */
export async function applyPronunciationPipeline(
  text: string,
  locale: string = "fr-CA"
): Promise<{ original: string; transformed: string; appliedRuleIds: string[] }> {
  const rules = await fetchPronunciationRules(locale);
  const { transformed, appliedRuleIds } = applyPronunciationRules(text, rules);
  return { original: text, transformed, appliedRuleIds };
}

/**
 * Log a pronunciation transformation to DB (fire-and-forget).
 */
export function logPronunciationTransformation(
  sessionId: string | null,
  original: string,
  transformed: string,
  locale: string,
  appliedRuleIds: string[]
) {
  // Fire and forget — don't block the voice pipeline
  supabase
    .from("alex_voice_pronunciation_logs")
    .insert({
      voice_session_id: sessionId,
      original_text: original,
      transformed_text: transformed,
      locale,
      applied_rules_json: appliedRuleIds,
    })
    .then(({ error }) => {
      if (error) console.warn("[PronunciationRules] Log failed:", error.message);
    });
}

/** Clear cache (for admin after editing rules). */
export function clearPronunciationCache() {
  ruleCache.clear();
}
