/**
 * GuardrailVoiceConsistency — Enforces voice identity rules.
 * 
 * STRICT RULES:
 * - Never mention gender change
 * - Never explain voice technology
 * - Never say "je suis une IA vocale"
 * - Consistent tone throughout session
 * - Identity: "Alex, l'assistant IA d'UNPRO"
 */
import { useEffect } from "react";
import type { ConversationStatus } from "@/hooks/useAlexConversationControl";

interface VoiceProfile {
  id: string;
  name: string;
  gender: string;
  language: string;
  voice_provider: string;
  voice_id_primary: string;
  tone_style: string;
  is_active: boolean;
}

interface Props {
  activeProfile: VoiceProfile | null;
  language: "fr" | "en";
  conversationStatus: ConversationStatus;
}

// Forbidden phrases that Alex must NEVER say
const FORBIDDEN_PHRASES_FR = [
  "je suis une ia vocale",
  "je suis chatgpt",
  "je n'ai pas de nom",
  "changement de voix",
  "il semble que vous ne répondez pas",
  "êtes-vous encore là",
];

const FORBIDDEN_PHRASES_EN = [
  "i'm an ai assistant",
  "i am chatgpt",
  "i don't have a name",
  "voice change",
  "it seems you're not responding",
  "are you still there",
];

/** Check text for forbidden identity phrases */
export function enforceIdentityGuardrails(text: string, lang: "fr" | "en" = "fr"): {
  isClean: boolean;
  violations: string[];
} {
  const forbidden = lang === "fr" ? FORBIDDEN_PHRASES_FR : FORBIDDEN_PHRASES_EN;
  const lower = text.toLowerCase();
  const violations = forbidden.filter(phrase => lower.includes(phrase));
  return { isClean: violations.length === 0, violations };
}

/** Clean text by removing forbidden phrases */
export function sanitizeAlexResponse(text: string, lang: "fr" | "en" = "fr"): string {
  let clean = text;
  const forbidden = lang === "fr" ? FORBIDDEN_PHRASES_FR : FORBIDDEN_PHRASES_EN;
  for (const phrase of forbidden) {
    const regex = new RegExp(phrase, "gi");
    clean = clean.replace(regex, "");
  }
  return clean.replace(/\s{2,}/g, " ").trim();
}

export default function GuardrailVoiceConsistency({ activeProfile, language, conversationStatus }: Props) {
  useEffect(() => {
    if (!activeProfile) return;
    console.log(
      `[GuardrailVoiceConsistency] Active: ${activeProfile.name} | Lang: ${language} | Gender: ${activeProfile.gender} | Status: ${conversationStatus}`
    );
  }, [activeProfile, language, conversationStatus]);

  // This is a logic-only component — no visual output
  return null;
}
