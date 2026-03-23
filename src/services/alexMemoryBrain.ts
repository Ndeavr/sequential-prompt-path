/**
 * AlexMemoryBrain — Persistent memory for Alex.
 * Stores preferences, past questions, property data, contractor goals, friction points.
 * Rule: never ask twice what Alex already knows.
 */
import { supabase } from "@/integrations/supabase/client";

export interface MemoryEntry {
  key: string;
  value: string;
  category: "preference" | "property" | "goal" | "friction" | "history" | "context";
  importance: number; // 1-10
  expiresAt?: string;
}

export interface SessionSummary {
  userId: string;
  topIntent: string | null;
  keyFacts: string[];
  frictionPoints: string[];
  nextBestAction: string | null;
  momentum: "cold" | "warming" | "active" | "ready_to_convert";
  turnCount: number;
}

// ─── In-memory cache (per session) ───
const sessionCache = new Map<string, Map<string, MemoryEntry>>();

function getCache(userId: string): Map<string, MemoryEntry> {
  if (!sessionCache.has(userId)) sessionCache.set(userId, new Map());
  return sessionCache.get(userId)!;
}

// ─── Store ───
export async function storeMemory(
  userId: string,
  entry: MemoryEntry
): Promise<void> {
  getCache(userId).set(entry.key, entry);

  // Persist to Supabase agent_memory (reuse existing table)
  try {
    await supabase.from("agent_memory").upsert(
      {
        agent_key: "alex-brain",
        memory_key: `${userId}:${entry.key}`,
        memory_type: entry.category,
        content: entry.value,
        importance: entry.importance,
        domain: "alex",
        expires_at: entry.expiresAt ?? null,
      },
      { onConflict: "memory_key" }
    );
  } catch {
    // Silent — cache still works
  }
}

// ─── Retrieve ───
export async function retrieveMemory(
  userId: string,
  key: string
): Promise<string | null> {
  const cached = getCache(userId).get(key);
  if (cached) return cached.value;

  try {
    const { data } = await supabase
      .from("agent_memory")
      .select("content")
      .eq("memory_key", `${userId}:${key}`)
      .eq("agent_key", "alex-brain")
      .maybeSingle();
    return data?.content ?? null;
  } catch {
    return null;
  }
}

// ─── Retrieve all for user ───
export async function retrieveAllMemory(
  userId: string
): Promise<MemoryEntry[]> {
  const cache = getCache(userId);
  if (cache.size > 0) return Array.from(cache.values());

  try {
    const { data } = await supabase
      .from("agent_memory")
      .select("memory_key, content, memory_type, importance")
      .eq("agent_key", "alex-brain")
      .like("memory_key", `${userId}:%`)
      .order("importance", { ascending: false })
      .limit(50);

    return (data ?? []).map((d) => ({
      key: d.memory_key.replace(`${userId}:`, ""),
      value: d.content,
      category: d.memory_type as MemoryEntry["category"],
      importance: d.importance ?? 5,
    }));
  } catch {
    return [];
  }
}

// ─── Update ───
export async function updateMemory(
  userId: string,
  key: string,
  value: string
): Promise<void> {
  const cache = getCache(userId);
  const existing = cache.get(key);
  if (existing) {
    existing.value = value;
    cache.set(key, existing);
  }
  await storeMemory(userId, {
    key,
    value,
    category: existing?.category ?? "context",
    importance: existing?.importance ?? 5,
  });
}

// ─── Session Summary (compression) ───
export function summarizeSession(
  turns: Array<{ role: "user" | "alex"; text: string }>,
  context?: { frictionSignals?: string[]; intent?: string }
): SessionSummary {
  const userTurns = turns.filter((t) => t.role === "user");
  const alexTurns = turns.filter((t) => t.role === "alex");

  // Extract key facts from user turns
  const keyFacts = userTurns
    .map((t) => t.text)
    .filter((t) => t.length > 10)
    .slice(-5);

  // Detect momentum
  let momentum: SessionSummary["momentum"] = "cold";
  if (turns.length >= 6) momentum = "active";
  else if (turns.length >= 3) momentum = "warming";

  // Check for conversion signals
  const conversionWords = ["rendez-vous", "booking", "réserver", "plan", "prix", "coût"];
  const hasConversionIntent = userTurns.some((t) =>
    conversionWords.some((w) => t.text.toLowerCase().includes(w))
  );
  if (hasConversionIntent && turns.length >= 4) momentum = "ready_to_convert";

  return {
    userId: "",
    topIntent: context?.intent ?? null,
    keyFacts,
    frictionPoints: context?.frictionSignals ?? [],
    nextBestAction: null,
    momentum,
    turnCount: turns.length,
  };
}

// ─── Check if Alex already knows something ───
export async function alexAlreadyKnows(
  userId: string,
  key: string
): Promise<boolean> {
  const val = await retrieveMemory(userId, key);
  return val !== null && val.trim() !== "";
}
