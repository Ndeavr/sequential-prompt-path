/**
 * popularQuestions — client helper to log user questions for the
 * "Questions populaires en ce moment" rail. Fire-and-forget; never blocks UI.
 *
 * No PII is ever sent: text is sanitized + length-capped client-side.
 */
import { supabase } from "@/integrations/supabase/client";
import { detectAlexIntent, type AlexIntent, type AlexRole } from "@/services/alexOpeningTemplates";

export type PopularQuestionSource =
  | "home_text_input"
  | "home_chip_tap"
  | "voice_first_utterance"
  | "chat_composer"
  | "other";

const PII_PATTERNS: RegExp[] = [
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,                  // email
  /(\+?\d[\d\s().-]{7,})/g,                     // phone
  /\b[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d\b/g,   // QC postal code
  /\b\d{1,5}\s+[A-Za-zÀ-ÿ'.-]+(?:\s+[A-Za-zÀ-ÿ'.-]+){0,4}/g, // street-like
];

const BLOCKLIST_SUBSTRINGS = ["http://", "https://", "www.", "<", ">"];

function stripPII(input: string): string {
  let out = input;
  for (const re of PII_PATTERNS) out = out.replace(re, " ");
  return out.replace(/\s+/g, " ").trim();
}

export function normalizeQuestion(raw: string): string | null {
  if (!raw) return null;
  const cleaned = stripPII(raw)
    .toLowerCase()
    .replace(/[«»"'`]/g, "")
    .replace(/[?!.…]+$/g, "")
    .trim();
  if (cleaned.length < 6 || cleaned.length > 240) return null;
  for (const bad of BLOCKLIST_SUBSTRINGS) if (cleaned.includes(bad)) return null;
  // Truncate to 120 chars at last word boundary
  if (cleaned.length <= 120) return cleaned;
  const sliced = cleaned.slice(0, 120);
  const lastSpace = sliced.lastIndexOf(" ");
  return (lastSpace > 60 ? sliced.slice(0, lastSpace) : sliced).trim();
}

interface LogOptions {
  role?: AlexRole | null;
  lang?: string;
  source: PopularQuestionSource;
  topic?: string | null;
  intent?: AlexIntent | null;
}

export function logQuestion(rawText: string, opts: LogOptions): void {
  try {
    const normalized = normalizeQuestion(rawText);
    if (!normalized) return;
    const intent = opts.intent ?? detectAlexIntent(rawText, null, opts.role ?? null);
    // Fire-and-forget — never await on UI path.
    void supabase
      .from("popular_question_events")
      .insert({
        normalized_label: normalized,
        topic: opts.topic ?? null,
        intent,
        role: opts.role ?? null,
        lang: opts.lang ?? "fr-CA",
        source: opts.source,
      })
      .then(() => {}, () => {});
  } catch {
    // Silent — telemetry must never break UX.
  }
}
