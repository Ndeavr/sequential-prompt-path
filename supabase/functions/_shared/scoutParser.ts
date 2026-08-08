/**
 * UNPRO Scout — shared capture parser.
 *
 * Pure functions only (no Deno/browser APIs) so the same logic runs in:
 *  - the Chrome extension content script (bundled copy)
 *  - the scout-ingest edge function
 *  - vitest unit tests
 *
 * Never invents values: a field is either extracted from the visible text or null.
 */

export type ExtractionMode = "dom" | "image" | "manual";

export interface ScoutSignals {
  company_name: string | null;
  contact_name: string | null;
  phone_e164: string | null;
  phone_raw: string | null;
  email: string | null;
  website_url: string | null;
  rbq_number: string | null;
  city: string | null;
  category: string | null;
  intent_score: number;
  intent_evidence: string | null;
  confidence: number;
}

/* ── Normalizers (aligned with _shared/normalizePhone.ts) ─────────── */

export function toE164(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  let d = digits;
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10) return null;
  if (!/^[2-9]/.test(d) || !/^[2-9]/.test(d.slice(3, 6))) return null;
  return `+1${d}`;
}

export function normalizeDomain(url?: string | null): string | null {
  if (!url) return null;
  return (
    String(url)
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/[/?#].*$/, "")
      .trim() || null
  );
}

export function normalizeEmail(raw?: string | null): string | null {
  if (!raw) return null;
  const m = String(raw).toLowerCase().trim().match(/^[\w.+-]+@[\w-]+\.[\w.-]+$/);
  return m ? m[0] : null;
}

/* ── Detectors ────────────────────────────────────────────────────── */

// (514) 555-1234 / 514-555-1234 / 514.555.1234 / 5145551234 / +1 514 555 1234
const PHONE_RE = /(?:\+?1[\s.\-]?)?\(?([2-9]\d{2})\)?[\s.\-]?([2-9]\d{2})[\s.\-]?(\d{4})\b/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/gi;
const URL_RE = /\b(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.(?:ca|com|net|org|quebec|qc\.ca|info|biz))(?:\/\S*)?/gi;
// RBQ: 8 digits grouped 4-4-2 (e.g. RBQ 5678-1234-01) — accept common separators.
const RBQ_RE = /\bRBQ\s*[:#-]?\s*(\d{4}[\s.\-]?\d{4}[\s.\-]?\d{2})\b/i;

export const INTENT_PHRASES: Array<{ phrase: string; weight: number }> = [
  { phrase: "disponible pour partenariat", weight: 50 },
  { phrase: "dispo pour partenariat", weight: 50 },
  { phrase: "cherche contrats", weight: 50 },
  { phrase: "cherche des contrats", weight: 50 },
  { phrase: "disponible pour travaux", weight: 45 },
  { phrase: "entrepreneur disponible", weight: 45 },
  { phrase: "sous-traitance", weight: 40 },
  { phrase: "sous traitance", weight: 40 },
  { phrase: "partenariat", weight: 35 },
  { phrase: "looking for work", weight: 45 },
  { phrase: "available for projects", weight: 45 },
  { phrase: "disponible immédiatement", weight: 35 },
  { phrase: "prends de nouveaux clients", weight: 35 },
  { phrase: "soumission gratuite", weight: 20 },
  { phrase: "contactez-moi", weight: 15 },
  { phrase: "en privé", weight: 10 },
];

export const TRADE_KEYWORDS: Array<{ kw: string; category: string }> = [
  { kw: "plomberie", category: "plomberie" },
  { kw: "plombier", category: "plomberie" },
  { kw: "toiture", category: "toiture" },
  { kw: "couvreur", category: "toiture" },
  { kw: "électricien", category: "electricite" },
  { kw: "electricien", category: "electricite" },
  { kw: "électricité", category: "electricite" },
  { kw: "excavation", category: "excavation" },
  { kw: "isolation", category: "isolation" },
  { kw: "peinture", category: "peinture" },
  { kw: "peintre", category: "peinture" },
  { kw: "menuiserie", category: "menuiserie" },
  { kw: "menuisier", category: "menuiserie" },
  { kw: "céramique", category: "ceramique" },
  { kw: "ceramique", category: "ceramique" },
  { kw: "paysagement", category: "paysagement" },
  { kw: "paysagiste", category: "paysagement" },
  { kw: "asphalte", category: "asphalte" },
  { kw: "déneigement", category: "deneigement" },
  { kw: "deneigement", category: "deneigement" },
  { kw: "rénovation", category: "renovation" },
  { kw: "renovation", category: "renovation" },
  { kw: "construction", category: "construction" },
  { kw: "climatisation", category: "cvac" },
  { kw: "chauffage", category: "cvac" },
];

const QC_CITIES = [
  "montréal", "montreal", "laval", "longueuil", "québec", "quebec", "gatineau",
  "sherbrooke", "trois-rivières", "trois-rivieres", "terrebonne", "repentigny",
  "brossard", "saint-jérôme", "saint-jerome", "blainville", "mirabel", "boucherville",
  "mascouche", "lévis", "levis", "granby", "drummondville", "saint-eustache",
];

const COMPANY_SUFFIX = /(inc\.?|ltée|ltee|ltd\.?|enr\.?|s\.e\.n\.c\.?|senc)\b/i;

function titleCity(c: string): string {
  return c
    .split(/([\s-])/)
    .map((p) => (/[\s-]/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join("");
}

/**
 * Extract every UNPRO-relevant signal from a block of visible text.
 * `authorName` (Facebook display name) is used only as a contact-name fallback.
 */
export function parseScoutText(rawText: string, authorName?: string | null): ScoutSignals {
  const text = (rawText ?? "").toString();
  const lower = text.toLowerCase();

  // phone
  PHONE_RE.lastIndex = 0;
  const phoneMatch = PHONE_RE.exec(text);
  const phone_raw = phoneMatch ? phoneMatch[0].trim() : null;
  const phone_e164 = toE164(phone_raw);

  // email
  const emailMatch = text.match(EMAIL_RE);
  const email = normalizeEmail(emailMatch?.[0] ?? null);

  // website (ignore facebook/instagram and the email domain)
  let website_url: string | null = null;
  URL_RE.lastIndex = 0;
  let um: RegExpExecArray | null;
  while ((um = URL_RE.exec(text)) !== null) {
    const host = um[1].toLowerCase();
    if (/facebook\.|fb\.|instagram\.|messenger\./.test(host)) continue;
    if (email && email.endsWith(`@${host}`)) {
      website_url = `https://${host}`;
      break;
    }
    website_url = `https://${host}`;
    break;
  }

  // RBQ
  const rbqMatch = text.match(RBQ_RE);
  const rbq_number = rbqMatch ? rbqMatch[1].replace(/[\s.]/g, "-").replace(/-+/g, "-") : null;

  // company: first line containing a legal suffix, else a line in the text
  let company_name: string | null = null;
  for (const line of text.split(/\n+/)) {
    const l = line.trim();
    if (l.length >= 3 && l.length <= 120 && COMPANY_SUFFIX.test(l)) {
      company_name = l.replace(/^[-•*\s]+/, "").slice(0, 120);
      break;
    }
  }

  // category + city
  const trade = TRADE_KEYWORDS.find((t) => lower.includes(t.kw));
  const cityHit = QC_CITIES.find((c) => lower.includes(c));

  // intent
  const hits = INTENT_PHRASES.filter((p) => lower.includes(p.phrase));
  const intent_score = Math.min(100, hits.reduce((s, h) => s + h.weight, 0));
  const intent_evidence = hits.length
    ? hits.map((h) => h.phrase).join(" | ")
    : null;

  const confidence = Math.min(
    1,
    (phone_e164 ? 0.35 : 0) +
      (email ? 0.25 : 0) +
      (company_name ? 0.2 : 0) +
      (website_url ? 0.1 : 0) +
      (trade ? 0.1 : 0),
  );

  return {
    company_name,
    contact_name: authorName?.trim() || null,
    phone_e164,
    phone_raw,
    email,
    website_url,
    rbq_number,
    city: cityHit ? titleCity(cityHit) : null,
    category: trade?.category ?? null,
    intent_score,
    intent_evidence,
    confidence: Number(confidence.toFixed(2)),
  };
}

/** A capture is only worth ingesting when it carries at least one contact point. */
export function hasContactPoint(s: Pick<ScoutSignals, "phone_e164" | "email" | "website_url">): boolean {
  return Boolean(s.phone_e164 || s.email || s.website_url);
}
