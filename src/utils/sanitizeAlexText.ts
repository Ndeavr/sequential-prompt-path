/**
 * sanitizeAlexText — Strips technical tokens, tool calls, and JSON blobs
 * from any Alex-generated text BEFORE it ever reaches the chat UI.
 *
 * RULE: The user must never see internal tool names like `open_upload`,
 * raw function calls, JSON payloads, or model reasoning.
 */

const FORBIDDEN_TOKENS = [
  "open_upload",
  "open_camera",
  "open_voice",
  "open_chat",
  "save_profile",
  "match_pro",
  "trigger_upload",
  "show_upload_button",
];

const TOOL_LINE_RE = /^\s*(action|tool|function|event)\s*[:=]\s*\S+/i;
const FUNCTION_TAG_RE = /<\/?function[\w-]*[^>]*>/gi;
const JSON_BLOCK_RE = /\{[^{}]*?"(?:tool|action|function|name|args|arguments)"\s*:[^{}]*?\}/g;
const CODE_FENCE_RE = /```[\s\S]*?```/g;
const BACKTICK_TOKEN_RE = /`(open_upload|open_camera|open_voice|save_profile|match_pro|trigger_upload)`/gi;

export interface SanitizeResult {
  /** Cleaned text safe for rendering. May be empty if everything was junk. */
  text: string;
  /** True if forbidden content was detected and removed. */
  hadForbidden: boolean;
}

export function sanitizeAlexText(input: string | null | undefined): SanitizeResult {
  if (!input) return { text: "", hadForbidden: false };

  let text = input;
  let hadForbidden = false;

  // Strip code fences entirely — Alex chat never shows code blocks
  if (CODE_FENCE_RE.test(text)) {
    hadForbidden = true;
    text = text.replace(CODE_FENCE_RE, "").trim();
  }

  // Strip JSON blobs containing tool/action keys
  if (JSON_BLOCK_RE.test(text)) {
    hadForbidden = true;
    text = text.replace(JSON_BLOCK_RE, "").trim();
  }

  // Strip <function …/> tags
  if (FUNCTION_TAG_RE.test(text)) {
    hadForbidden = true;
    text = text.replace(FUNCTION_TAG_RE, "").trim();
  }

  // Strip backtick tokens like `open_upload`
  if (BACKTICK_TOKEN_RE.test(text)) {
    hadForbidden = true;
    text = text.replace(BACKTICK_TOKEN_RE, "").trim();
  }

  // Drop any line that is just a tool/action declaration
  const cleanedLines = text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (TOOL_LINE_RE.test(trimmed)) {
        hadForbidden = true;
        return false;
      }
      // Reject lines that are JUST a forbidden token (e.g. "open_upload")
      const lowered = trimmed.toLowerCase().replace(/[.,!?;:`*_]/g, "");
      if (FORBIDDEN_TOKENS.includes(lowered)) {
        hadForbidden = true;
        return false;
      }
      return true;
    });

  text = cleanedLines.join("\n");

  // Strip standalone forbidden tokens that may appear inline
  for (const token of FORBIDDEN_TOKENS) {
    const re = new RegExp(`\\b${token}\\b`, "gi");
    if (re.test(text)) {
      hadForbidden = true;
      text = text.replace(re, "").trim();
    }
  }

  // Collapse whitespace
  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  return { text, hadForbidden };
}

/** Convenience wrapper that returns just the cleaned string. */
export function cleanAlexText(input: string | null | undefined): string {
  return sanitizeAlexText(input).text;
}
