/**
 * DNA Gate — checks the persisted homeowner DNA before Alex asks a question.
 * When a fact is already known with confidence >= threshold, the question is skipped.
 */
import { supabase } from "@/integrations/supabase/client";
import { getAlexFlag } from "@/lib/alexFeatureFlags";

export const DNA_CONFIDENCE_THRESHOLD = 0.75;

/** Map qualification-question field -> dot-path inside homeowner_compat_dna. */
export const QUESTION_TO_DNA_FIELD: Record<string, string> = {
  "property.type": "property.type",
  "problem.category": "preferences.primary_category",
  urgency: "preferences.timing",
  budget: "preferences.budget_band",
  "photos.requested": "behavior.shares_photos",
  // Environment / communication driven by the memory extractor
  pets: "environment.pets",
  "communication.language": "communication.language",
  "communication.preferred_channel": "communication.preferred_channel",
  "communication.style": "communication.style",
};

export interface KnownDnaFacts {
  values: Record<string, unknown>;
  confidence: Record<string, number>;
}

function getByPath(obj: any, path: string): unknown {
  if (!obj) return undefined;
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

/** Load persisted DNA once per session and flatten into { field: value, field: conf } maps. */
export async function loadKnownDnaFacts(userId: string | null | undefined): Promise<KnownDnaFacts> {
  const empty: KnownDnaFacts = { values: {}, confidence: {} };
  if (!userId || !getAlexFlag("compat_memory_engine_v1")) return empty;
  try {
    const { data } = await (supabase as any)
      .from("homeowner_compat_dna")
      .select("communication,property,preferences,environment,behavior,confidence")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return empty;
    const values: Record<string, unknown> = {};
    const confidence: Record<string, number> = {};
    for (const [field, dnaPath] of Object.entries(QUESTION_TO_DNA_FIELD)) {
      const v = getByPath(data, dnaPath);
      if (v !== undefined && v !== null && v !== "") {
        values[field] = v;
      }
      const c = getByPath(data.confidence, dnaPath);
      if (typeof c === "number") confidence[field] = c;
    }
    return { values, confidence };
  } catch (err) {
    console.warn("[dnaGate] load failed", err);
    return empty;
  }
}

/** True when Alex already knows this field with sufficient confidence. */
export function isFieldKnown(facts: KnownDnaFacts, field: string): boolean {
  const has = facts.values[field] !== undefined;
  if (!has) return false;
  const conf = facts.confidence[field];
  if (typeof conf !== "number") return true; // known without confidence => trust it
  return conf >= DNA_CONFIDENCE_THRESHOLD;
}
