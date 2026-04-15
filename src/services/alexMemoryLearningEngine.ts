/**
 * AlexMemoryLearningEngine — Extracts implicit signals and persists to memory.
 * 
 * After each user message:
 * - Analyze text for implicit signals (property type, budget hints, location, constraints)
 * - Store in alex_user_memory table
 * 
 * Before each Alex response:
 * - Load user memory
 * - Inject into context
 */

import { supabase } from "@/integrations/supabase/client";

export interface MemorySignal {
  key: string;
  value: string;
  confidence: number;
  source: string;
}

// ─── SIGNAL EXTRACTION ───
const PROPERTY_TYPE_PATTERNS: Record<string, RegExp[]> = {
  "maison_unifamiliale": [/maison/i, /bungalow/i, /cottage/i, /unifamiliale/i],
  "condo": [/condo/i, /copropriété/i, /appartement/i],
  "duplex": [/duplex/i, /triplex/i, /multiplex/i, /plex/i],
  "chalet": [/chalet/i, /camp/i],
  "commercial": [/commercial/i, /bureau/i, /local/i],
};

const BUDGET_PATTERNS: Array<{ pattern: RegExp; range: string }> = [
  { pattern: /moins de (\d+)/i, range: "low" },
  { pattern: /budget.*?(\d+)/i, range: "specified" },
  { pattern: /pas cher/i, range: "economy" },
  { pattern: /qualité/i, range: "quality" },
  { pattern: /luxe|haut de gamme|premium/i, range: "premium" },
];

const CONSTRAINT_PATTERNS: Record<string, RegExp> = {
  "weekend_only": /fin de semaine|samedi|dimanche|weekend/i,
  "evenings_only": /soir|après.*travail|18h|19h/i,
  "language_english": /english|anglais/i,
  "language_french": /français|french/i,
  "parking_needed": /stationnement|parking/i,
  "pet_present": /chat|chien|animal/i,
};

export function extractSignals(text: string): MemorySignal[] {
  const signals: MemorySignal[] = [];
  const lower = text.toLowerCase();

  // Property type
  for (const [type, patterns] of Object.entries(PROPERTY_TYPE_PATTERNS)) {
    if (patterns.some(p => p.test(lower))) {
      signals.push({ key: "property_type", value: type, confidence: 0.8, source: "message" });
      break;
    }
  }

  // Budget hints
  for (const { pattern, range } of BUDGET_PATTERNS) {
    const match = lower.match(pattern);
    if (match) {
      signals.push({
        key: "budget_range",
        value: match[1] ? `${range}:${match[1]}` : range,
        confidence: 0.6,
        source: "message",
      });
      break;
    }
  }

  // Constraints
  for (const [constraint, pattern] of Object.entries(CONSTRAINT_PATTERNS)) {
    if (pattern.test(lower)) {
      signals.push({ key: `constraint_${constraint}`, value: "true", confidence: 0.7, source: "message" });
    }
  }

  // Year built
  const yearMatch = lower.match(/construit.*?(\d{4})|(\d{4}).*?construction/);
  if (yearMatch) {
    const year = yearMatch[1] || yearMatch[2];
    signals.push({ key: "year_built", value: year, confidence: 0.9, source: "message" });
  }

  // Square footage
  const sqftMatch = lower.match(/(\d+)\s*(?:pi2|pieds?\s*carrés?|sqft|sq\s*ft)/i);
  if (sqftMatch) {
    signals.push({ key: "square_footage", value: sqftMatch[1], confidence: 0.9, source: "message" });
  }

  return signals;
}

// ─── PERSISTENCE ───
export async function storeMemorySignals(userId: string, signals: MemorySignal[]): Promise<void> {
  if (!signals.length) return;

  for (const signal of signals) {
    const { error } = await supabase
      .from("alex_user_memory")
      .upsert(
        {
          user_id: userId,
          memory_key: signal.key,
          memory_value: signal.value,
          confidence_score: signal.confidence,
          source: signal.source,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "user_id,memory_key" }
      );

    if (error) {
      console.warn(`[MemoryLearning] Failed to store signal ${signal.key}:`, error.message);
    }
  }
}

export async function loadUserMemory(userId: string): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("alex_user_memory")
    .select("memory_key, memory_value")
    .eq("user_id", userId)
    .order("last_used_at", { ascending: false });

  if (error || !data) return {};

  const memory: Record<string, string> = {};
  for (const row of data) {
    memory[row.memory_key] = row.memory_value;
  }
  return memory;
}

// ─── LEARNING EVENTS ───
export async function logLearningEvent(
  sessionId: string,
  eventType: string,
  outcome: string,
  userId?: string,
  metadata?: Record<string, any>,
): Promise<void> {
  const { error } = await supabase
    .from("alex_learning_events")
    .insert({
      session_id: sessionId,
      user_id: userId || null,
      event_type: eventType,
      outcome,
      metadata_json: metadata || {},
    });

  if (error) {
    console.warn("[MemoryLearning] Failed to log event:", error.message);
  }
}

// ─── CONVERSATION LOG ───
export async function logConversationTurn(
  sessionId: string,
  userMessage: string,
  alexResponse: string,
  intentDetected: string | null,
  userId?: string,
): Promise<void> {
  const { error } = await supabase
    .from("alex_conversation_log")
    .insert({
      session_id: sessionId,
      user_id: userId || null,
      user_message: userMessage,
      alex_response: alexResponse,
      intent_detected: intentDetected,
    });

  if (error) {
    console.warn("[MemoryLearning] Failed to log conversation:", error.message);
  }
}

// ─── INFERRED PREFERENCES ───
export async function storeInferredPreference(
  userId: string,
  key: string,
  value: string,
  confidence: number,
): Promise<void> {
  const { error } = await supabase
    .from("alex_inferred_prefs")
    .upsert(
      {
        user_id: userId,
        preference_key: key,
        preference_value: value,
        confidence_score: confidence,
      },
      { onConflict: "user_id,preference_key" }
    );

  if (error) {
    console.warn("[MemoryLearning] Failed to store preference:", error.message);
  }
}
