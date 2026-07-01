// Universal acquisition-lead normalization layer.
// Pure functions — no I/O. Used by scraper, enricher, validators, dispatchers,
// Resend, Twilio, Stripe metadata, tracking-link builder, and admin UI.

const INVISIBLE_RE = /[\u200B-\u200D\uFEFF\u00A0\u2060]/g;
const DIACRITIC_RE = /\p{Diacritic}/gu;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Common Twilio "magic" / test / obviously-fake patterns.
const FAKE_PHONE_RES: RegExp[] = [
  /^\+?1?5{3}\d{7}$/,       // 555-XXX-XXXX area codes are reserved
  /^\+?1?(\d)\1{9}$/,       // all-same-digit
  /^\+?1?450555\d{4}$/,     // requested block
  /^\+?1?0{10}$/,
  /^\+?1?1{10}$/,
];

const stripInvisible = (s: string) => s.replace(INVISIBLE_RE, "");
const stripAccents = (s: string) =>
  s.normalize("NFKD").replace(DIACRITIC_RE, "");

// ---------- EMAIL ----------
export type NormalizedEmail = { value: string | null; valid: boolean; error?: string };

export function normalizeEmail(raw: unknown): NormalizedEmail {
  if (raw == null) return { value: null, valid: false, error: "empty" };
  const cleaned = stripInvisible(String(raw)).trim().toLowerCase();
  if (!cleaned) return { value: null, valid: false, error: "empty" };
  if (!EMAIL_RE.test(cleaned)) return { value: cleaned, valid: false, error: "invalid_format" };
  if (cleaned.length > 254) return { value: cleaned, valid: false, error: "too_long" };
  return { value: cleaned, valid: true };
}

// ---------- PHONE ----------
export type PhoneStatus = "valid" | "invalid" | "test" | "empty";
export type NormalizedPhone = {
  original: string | null;
  normalized: string | null;
  e164: string | null;
  status: PhoneStatus;
  error?: string;
};

export function normalizePhone(raw: unknown): NormalizedPhone {
  if (raw == null) return { original: null, normalized: null, e164: null, status: "empty" };
  const original = String(raw);
  const digits = stripInvisible(original).replace(/[^\d]/g, "");
  if (!digits) return { original, normalized: null, e164: null, status: "empty" };

  let core = digits;
  if (core.length === 11 && core.startsWith("1")) core = core.slice(1);
  if (core.length !== 10) {
    return { original, normalized: digits, e164: null, status: "invalid", error: "bad_length" };
  }
  const e164 = `+1${core}`;
  for (const re of FAKE_PHONE_RES) {
    if (re.test(e164)) {
      return { original, normalized: digits, e164, status: "test", error: "fake_number" };
    }
  }
  // NANP area codes never start with 0 or 1
  if (core[0] === "0" || core[0] === "1") {
    return { original, normalized: digits, e164, status: "invalid", error: "bad_area_code" };
  }
  return { original, normalized: digits, e164, status: "valid" };
}

// ---------- WEBSITE ----------
export type NormalizedWebsite = {
  value: string | null;
  host: string | null;
  valid: boolean;
  error?: string;
};

export function normalizeWebsite(raw: unknown): NormalizedWebsite {
  if (raw == null) return { value: null, host: null, valid: false, error: "empty" };
  let s = stripInvisible(String(raw)).trim();
  if (!s) return { value: null, host: null, valid: false, error: "empty" };
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    u.hostname = u.hostname.toLowerCase();
    if (!u.hostname.includes(".")) {
      return { value: null, host: null, valid: false, error: "invalid_host" };
    }
    // Drop trailing slash on the pathname unless it's just "/"
    let path = u.pathname || "/";
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    const rebuilt = `${u.protocol}//${u.hostname}${path === "/" ? "" : path}${u.search}${u.hash}`;
    return { value: rebuilt, host: u.hostname, valid: true };
  } catch {
    return { value: null, host: null, valid: false, error: "invalid_url" };
  }
}

// ---------- RESEND TAGS ----------
export type ResendTag = { name: string; value: string };

function sanitizeTagKey(raw: string, maxLen: number): string {
  return stripAccents(String(raw))
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, maxLen);
}

export function sanitizeResendTag(name: unknown, value: unknown): ResendTag | null {
  const n = sanitizeTagKey(String(name ?? ""), 40);
  const v = sanitizeTagKey(String(value ?? ""), 100);
  if (!n || !v) return null;
  return { name: n, value: v };
}

export function sanitizeResendTags(
  input: ResendTag[] | Record<string, unknown> | null | undefined,
): ResendTag[] {
  if (!input) return [];
  const items: Array<[unknown, unknown]> = Array.isArray(input)
    ? input.map((t) => [t?.name, t?.value])
    : Object.entries(input);
  const out: ResendTag[] = [];
  const seen = new Set<string>();
  for (const [n, v] of items) {
    const t = sanitizeResendTag(n, v);
    if (t && !seen.has(t.name)) {
      out.push(t);
      seen.add(t.name);
    }
  }
  return out;
}

// ---------- COMPANY NAME ----------
const COMPANY_SUFFIX_RE =
  /\b(inc|inc\.|ltée|ltee|ltd|ltd\.|llc|enr|enr\.|srl|s\.?e\.?n\.?c\.?|co|corp|corporation|company|group|groupe)\b\.?$/i;

export type NormalizedCompany = { display: string | null; key: string | null };

export function normalizeCompanyName(raw: unknown): NormalizedCompany {
  if (raw == null) return { display: null, key: null };
  const display = stripInvisible(String(raw)).replace(/\s+/g, " ").trim();
  if (!display) return { display: null, key: null };
  let key = stripAccents(display).toLowerCase();
  key = key.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  // strip trailing legal suffix (once)
  for (let i = 0; i < 3; i++) {
    const next = key.replace(COMPANY_SUFFIX_RE, "").trim();
    if (next === key) break;
    key = next;
  }
  return { display, key: key || null };
}

// ---------- SLUG / TRACKING ----------
export function slugifyForUrl(raw: unknown): string {
  return stripAccents(String(raw ?? ""))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const TRACKING_BASE = "https://unpro.ca/r";
export function buildTrackingUrl(params: {
  tracking_id?: string;
  lead_id?: string;
  campaign_id?: string;
}): string {
  const id = params.tracking_id?.trim();
  if (id) return `${TRACKING_BASE}/${encodeURIComponent(id)}`;
  const lead = slugifyForUrl(params.lead_id ?? "");
  const camp = slugifyForUrl(params.campaign_id ?? "");
  if (!lead) throw new Error("buildTrackingUrl_requires_id");
  return `${TRACKING_BASE}/${lead}${camp ? `-${camp}` : ""}`;
}

// ---------- LEAD ORCHESTRATOR ----------
export type NormalizationErrors = {
  email?: string;
  phone?: string;
  website?: string;
  company?: string;
};

export type NormalizedLead = {
  email_normalized: string | null;
  website_normalized: string | null;
  company_name_normalized: string | null;
  phone_original: string | null;
  phone_normalized: string | null;
  phone_e164: string | null;
  phone_validation_status: PhoneStatus;
  normalization_status: "ok" | "partial" | "rejected";
  normalization_errors: NormalizationErrors;
  normalized_at: string;
};

export type RawLead = {
  email?: unknown;
  phone?: unknown;
  mobile_phone?: unknown;
  website_url?: unknown;
  company_name?: unknown;
  [k: string]: unknown;
};

export function normalizeAcquisitionLead(raw: RawLead): NormalizedLead {
  const email = normalizeEmail(raw.email);
  const phoneRaw = (raw.mobile_phone != null && String(raw.mobile_phone).trim() !== "")
    ? raw.mobile_phone
    : raw.phone;
  const phone = normalizePhone(phoneRaw);
  const website = normalizeWebsite(raw.website_url);
  const company = normalizeCompanyName(raw.company_name);

  const errors: NormalizationErrors = {};
  if (email.error && raw.email != null) errors.email = email.error;
  if (phone.error && (raw.phone != null || raw.mobile_phone != null)) errors.phone = phone.error;
  if (website.error && raw.website_url != null) errors.website = website.error;
  if (!company.key && raw.company_name != null) errors.company = "empty";

  const hasAnyContact = !!email.value || phone.status === "valid";
  const hasAnyValid = email.valid || phone.status === "valid";
  let status: NormalizedLead["normalization_status"];
  if (!hasAnyContact) status = "rejected";
  else if (hasAnyValid && Object.keys(errors).length === 0) status = "ok";
  else status = hasAnyValid ? "partial" : "rejected";

  return {
    email_normalized: email.valid ? email.value : null,
    website_normalized: website.valid ? website.value : null,
    company_name_normalized: company.key,
    phone_original: phone.original,
    phone_normalized: phone.normalized,
    phone_e164: phone.status === "valid" ? phone.e164 : null,
    phone_validation_status: phone.status,
    normalization_status: status,
    normalization_errors: errors,
    normalized_at: new Date().toISOString(),
  };
}
