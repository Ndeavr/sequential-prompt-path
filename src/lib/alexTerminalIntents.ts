/**
 * alexTerminalIntents — Detects when the user has effectively closed the conversation.
 *
 * Used by the silence/re-engagement engines to STOP follow-up prompts
 * ("Êtes-vous toujours là ?") once the user has thanked Alex, said goodbye,
 * or Alex has reached a terminal outcome (booking, recommendation).
 */

export type TerminalIntent = "thanks" | "goodbye" | null;

const NORMALIZE = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const GOODBYE = [
  "au revoir",
  "bonne journee",
  "bonne soiree",
  "a bientot",
  "a plus tard",
  "ciao",
  "bye",
  "goodbye",
  "see you",
  "talk later",
  "bye bye",
];

const THANKS = [
  "merci",
  "merci beaucoup",
  "merci bien",
  "merci infiniment",
  "thanks",
  "thank you",
  "thx",
  "ty",
  "parfait merci",
];

export function detectTerminalIntent(text: string | null | undefined): TerminalIntent {
  if (!text) return null;
  const n = NORMALIZE(text);
  if (!n) return null;
  // Goodbye wins over thanks ("merci, bye" → goodbye).
  if (GOODBYE.some((p) => n === p || n.endsWith(" " + p) || n.startsWith(p + " ") || n.includes(" " + p + " "))) {
    return "goodbye";
  }
  if (THANKS.some((p) => n === p || n.endsWith(" " + p) || n.startsWith(p + " ") || n.includes(" " + p + " "))) {
    return "thanks";
  }
  return null;
}
