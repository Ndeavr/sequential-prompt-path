/**
 * Alex Voice Brain — Dedicated intelligence layer for Alex Voice.
 *
 * Separates the "thinking" from the gateway so the brain logic can be
 * reused by both the WebSocket gateway and the REST alex-voice function.
 *
 * Uses the shared French voice pipeline for consistent output processing.
 */

// ─── Types ───

export interface VoiceBrainInput {
  transcript: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  userId?: string | null;
  sessionId?: string | null;
  /** Display name (for UI) */
  userName?: string | null;
  /** Preferred spoken name (for TTS — may differ from userName) */
  preferredSpokenName?: string | null;
  pageContext?: {
    currentPage?: string;
    activeProperty?: string;
    isAuthenticated?: boolean;
    userRole?: string;
    hasScore?: boolean;
    hasPendingBooking?: boolean;
    hasUploadedImage?: boolean;
  };
}

export interface UiAction {
  type: string;
  target?: string;
  items?: string;
  [key: string]: string | undefined;
}

export interface VoiceBrainOutput {
  alexText: string;
  uiActions: UiAction[];
  nextBestAction: string | null;
}

// ─── System prompt (imported from shared French voice pipeline) ───
import { ALEX_VOICE_SYSTEM_PROMPT } from "./alex-french-voice.ts";
import { cleanTranscript } from "./alex-transcript-cleaner.ts";
import { resolveIntentFirst, buildIntentContext } from "./alex-intent-first-engine.ts";

// ─── Helpers ───

function buildContextBlock(input: VoiceBrainInput): string {
  const parts: string[] = [];
  const ctx = input.pageContext;
  if (ctx?.currentPage) parts.push(`Page actuelle: ${ctx.currentPage}`);
  if (ctx?.activeProperty) parts.push(`Propriété active: ${ctx.activeProperty}`);
  if (ctx?.isAuthenticated) parts.push(`Utilisateur connecté: oui`);
  if (ctx?.userRole) parts.push(`Rôle: ${ctx.userRole}`);
  if (ctx?.hasScore) parts.push(`Score maison existant: oui`);
  if (ctx?.hasPendingBooking) parts.push(`Rendez-vous en attente: oui`);
  if (ctx?.hasUploadedImage) parts.push(`Image uploadée: oui`);
  if (input.preferredSpokenName) parts.push(`Prénom pour la voix: ${input.preferredSpokenName}`);
  else if (input.userName) parts.push(`Prénom: ${input.userName}`);
  return parts.length > 0 ? "\n" + parts.join("\n") : "";
}

function extractUIActions(text: string): { cleanText: string; actions: UiAction[] } {
  const actions: UiAction[] = [];
  const regex = /<ui_action\s+([^/>]+)\s*\/>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const attrs: Record<string, string> = {};
    const attrRegex = /(\w+)="([^"]+)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(match[1])) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }
    if (attrs.type) actions.push(attrs as UiAction);
  }
  const cleanText = text.replace(/<ui_action[^/>]*\/>/g, "").trim();
  return { cleanText, actions };
}

function extractNextAction(text: string): { cleanText: string; nextAction: string | null } {
  const regex = /<next_action>([\s\S]*?)<\/next_action>/;
  const match = regex.exec(text);
  const nextAction = match ? match[1].trim() : null;
  const cleanText = text.replace(/<next_action>[\s\S]*?<\/next_action>/g, "").trim();
  return { cleanText, nextAction };
}

// ─── Main brain function ───

export async function alexVoiceBrain(
  input: VoiceBrainInput,
  options?: { signal?: AbortSignal }
): Promise<VoiceBrainOutput> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

  // Clean transcript before processing
  const cleaned = cleanTranscript(input.transcript);
  const processedTranscript = cleaned.cleaned || input.transcript;

  // Resolve intent-first for context enrichment
  const intentResult = resolveIntentFirst(processedTranscript);
  const intentContext = buildIntentContext(intentResult, cleaned.detectedKeywords);

  const contextBlock = buildContextBlock(input) + intentContext;

  const conversationMessages = [
    { role: "system", content: ALEX_VOICE_SYSTEM_PROMPT + contextBlock },
    ...(input.messages || []),
    { role: "user", content: processedTranscript },
  ];

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: conversationMessages,
    }),
    signal: options?.signal,
  });

  if (!aiResponse.ok) {
    const status = aiResponse.status;
    if (status === 429) throw new AlexBrainError("Rate limit exceeded", 429);
    if (status === 402) throw new AlexBrainError("Payment required", 402);
    throw new AlexBrainError(`AI error: ${status}`, status);
  }

  const aiData = await aiResponse.json();
  const rawText = aiData.choices?.[0]?.message?.content || "Je suis là pour vous aider.";

  // Extract next action first, then UI actions from cleaned text
  const { cleanText: afterNextAction, nextAction } = extractNextAction(rawText);
  const { cleanText, actions } = extractUIActions(afterNextAction);

  return {
    alexText: cleanText,
    uiActions: actions,
    nextBestAction: nextAction,
  };
}

// ─── Error class ───

export class AlexBrainError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AlexBrainError";
    this.status = status;
  }
}
