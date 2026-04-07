/**
 * useAlexLogFilter — Blocks internal/technical text from reaching the UI.
 * Prevents any "thinking out loud", code, debug info from being displayed.
 */

// Patterns that indicate internal AI reasoning — MUST be blocked from UI
const BLOCKED_PATTERNS = [
  /\*\*/,
  /^(Thought|Thinking|Processing|Analyzing|Evaluating|Considering)/i,
  /\b(Prioritizing|Refocusing|My focus|I will execute|I'm maintaining|My primary|I must now|My next step|according to my internal|Let me think|Internal note)\b/i,
  /\b(useLiveVoice|onTranscript|console\.log|function\(|import |export |const |let |var )\b/,
  /\bEdited\b.*\bsrc\//i,
  /\bFix\b.*\.(ts|tsx|js)\b/i,
  /```/,
  /^\s*\/\//,
  /\bThought for \d+/i,
  /\bpreview card\b/i,
  /\binternal chain\b/i,
  /\btool call\b/i,
  /\bstack trace\b/i,
  /\bdebug mode\b/i,
  /\bprompt:/i,
];

/**
 * Returns true if the text contains internal/technical content
 * that should NOT be shown to the user.
 */
export function isBlockedContent(text: string): boolean {
  if (!text || text.trim().length === 0) return true;
  return BLOCKED_PATTERNS.some(p => p.test(text));
}

/**
 * Clean any technical artifacts from text before display.
 * Returns null if the entire text should be blocked.
 */
export function filterForDisplay(text: string): string | null {
  if (!text || text.trim().length === 0) return null;
  if (isBlockedContent(text)) return null;

  // Remove markdown artifacts
  let clean = text
    .replace(/\*\*([^*]+)\*\*/g, "$1")  // bold
    .replace(/\*([^*]+)\*/g, "$1")       // italic
    .replace(/^#+\s*/gm, "")             // headers
    .replace(/^[-*]\s+/gm, "")           // list items
    .replace(/`([^`]+)`/g, "$1")         // inline code
    .replace(/\n{2,}/g, " ")             // multiple newlines
    .trim();

  // Final check after cleaning
  if (isBlockedContent(clean)) return null;
  return clean;
}

/**
 * Hook-style export for consistency
 */
export function useAlexLogFilter() {
  return {
    isBlocked: isBlockedContent,
    filter: filterForDisplay,
  };
}
