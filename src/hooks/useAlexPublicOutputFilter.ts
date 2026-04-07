/**
 * useAlexPublicOutputFilter — Blocks ALL internal/technical text from public UI.
 * Nothing from the model's reasoning, tool calls, or code should ever reach the user.
 */

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
  /\bEditing\b/i,
  /\brouter\.tsx\b/i,
  /\bimplementing\b/i,
  /\bfunction call\b/i,
  /\b\.tsx?\b/,
  /\bfix\b.*\b(bug|error|issue)\b/i,
];

/** Returns true if text should be blocked from public display */
export function isBlockedOutput(text: string): boolean {
  if (!text || text.trim().length === 0) return true;
  return BLOCKED_PATTERNS.some(p => p.test(text));
}

/** Clean and filter text for public display. Returns null if blocked. */
export function filterPublicOutput(text: string): string | null {
  if (!text || text.trim().length === 0) return null;
  if (isBlockedOutput(text)) return null;

  let clean = text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{2,}/g, " ")
    .trim();

  if (isBlockedOutput(clean)) return null;
  return clean;
}

export function useAlexPublicOutputFilter() {
  return { isBlocked: isBlockedOutput, filter: filterPublicOutput };
}
