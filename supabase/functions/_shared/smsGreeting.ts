// Pure helpers (no Deno APIs) — single source of truth for SMS salutation and
// the final fail-closed body validation run before ANY provider call.
// Incident 2026-10-12: 43 518 pending drafts began with "Bonjour ," (empty name).

const JUNK = new Set(["", "null", "undefined", "none", "nan", "n/a", "na", "-", "inconnu", "unknown", "test"]);

function clean(v: unknown): string {
  if (typeof v !== "string") return "";
  if (/[<>{}\[\]`$\\|]/.test(v)) return ""; // suspicious markup/template → treat as absent
  return v.normalize("NFC").replace(/[\u0000-\u001f\u007f<>{}\[\]`$\\|]/g, "").replace(/\s+/g, " ").trim();
}

/** A trustworthy human first name: letters (FR accents), optional hyphen/apostrophe, 2–30 chars. */
export function reliableFirstName(v: unknown): string | null {
  const s = clean(v);
  if (JUNK.has(s.toLowerCase())) return null;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’-]{1,29}$/.test(s)) return null;
  if (s === s.toUpperCase() && s.length > 3) return null; // machine-like ALL CAPS token
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** A plausible confirmed company name (2–60 chars, contains letters, no URLs/emails/phones). */
export function reliableCompanyName(v: unknown): string | null {
  const s = clean(v);
  if (JUNK.has(s.toLowerCase())) return null;
  if (s.length < 2 || s.length > 60) return null;
  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(s)) return null;
  if (/https?:|www\.|@|\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/i.test(s)) return null;
  return s;
}

export type GreetingInput = { first_name?: unknown; company_name?: unknown; first_name_reliable?: boolean };
export type GreetingKind = "first_name" | "company" | "generic";

/** A: prénom fiable → B: équipe de l'entreprise → C: générique. */
export function buildSmsGreeting(input: GreetingInput): { text: string; kind: GreetingKind } {
  const fn = input.first_name_reliable === false ? null : reliableFirstName(input.first_name);
  if (fn) return { text: `Bonjour ${fn},`, kind: "first_name" };
  const co = reliableCompanyName(input.company_name);
  if (co) return { text: `Bonjour à l'équipe de ${co},`, kind: "company" };
  return { text: "Bonjour, ici UNPRO.", kind: "generic" };
}

export type SmsBodyIssue =
  | "empty_body" | "empty_greeting" | "null_token" | "undefined_token"
  | "unresolved_template" | "a_null" | "fabricated_claim" | "too_long";

const FABRICATED = /(\bplaces? restantes?\b|\bderni[eè]res? places?\b|\b\d+\s+activations?\b|\bgaranti[es]?\b|\bscore\s*(ia|aipp)?\s*[:=]?\s*\d+|\b\d+\s+(rdv|rendez-vous)\b)/i;

/** Final fail-closed validation. Any issue = refuse send, keep draft. */
export function validateSmsBody(body: unknown, opts: { commercial?: boolean } = {}): { ok: boolean; issues: SmsBodyIssue[] } {
  const issues: SmsBodyIssue[] = [];
  const s = typeof body === "string" ? body : "";
  if (!s.trim()) issues.push("empty_body");
  if (opts.commercial && /^\s*(bonjour|salut|allo|hello|hi)\s*[,!.]/i.test(s) && !/^\s*bonjour,\s*ici unpro\./i.test(s)) issues.push("empty_greeting");
  if (/(bonjour|salut|allo|hello|hi)\s+,/i.test(s)) issues.push("empty_greeting");
  if (/\bnull\b/i.test(s)) issues.push("null_token");
  if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(s)) issues.push("undefined_token");
  if (/\{\{[^}]*\}\}|\$\{[^}]*\}|\{[a-z_]+\}|%[a-z_]+%/i.test(s)) issues.push("unresolved_template");
  if (/\b(à|a|de|chez)\s+(null|undefined)\b/i.test(s)) issues.push("a_null");
  if (opts.commercial && FABRICATED.test(s)) issues.push("fabricated_claim");
  if (s.length > 640) issues.push("too_long");
  return { ok: issues.length === 0, issues: [...new Set(issues)] };
}
