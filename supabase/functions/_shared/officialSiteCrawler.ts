/**
 * officialSiteCrawler — Structured crawl of a contractor's OFFICIAL website
 * for field-level provenance discovery.
 *
 * Pure module (no Supabase I/O) — safe to import from any edge function and
 * to unit-test directly. All fetch calls are guarded (timeout, size cap,
 * same-domain, robots-lite).
 *
 * Never call this to bypass the CASL / commercial-send gate. Discovery ≠ consent.
 */

// ---------- Domain resolution ----------

const BLOCKED_DOMAINS = new Set([
  "facebook.com", "www.facebook.com", "m.facebook.com", "fb.com",
  "instagram.com", "www.instagram.com",
  "linkedin.com", "www.linkedin.com", "ca.linkedin.com",
  "twitter.com", "x.com", "www.twitter.com",
  "youtube.com", "www.youtube.com", "youtu.be",
  "tiktok.com", "www.tiktok.com",
  "pinterest.com", "www.pinterest.com", "pinterest.ca",
  "google.com", "www.google.com", "maps.google.com",
  "yelp.ca", "yelp.com", "www.yelp.ca", "www.yelp.com",
  "pagesjaunes.ca", "www.pagesjaunes.ca", "yellowpages.ca",
  "homestars.com", "www.homestars.com",
  "soumissionrenovation.ca", "www.soumissionrenovation.ca",
  "reno-assistance.ca", "www.reno-assistance.ca",
  "guidedessoumissions.ca", "houzz.com", "www.houzz.com",
  "kijiji.ca", "www.kijiji.ca",
  "wix.com", "wixsite.com", "sites.google.com",
]);

export type DomainResolution = {
  original: string | null;
  canonical: string | null;
  host: string | null;
  is_blocked: boolean;
  reason?: string;
};

export function resolveOfficialDomain(raw: string | null | undefined): DomainResolution {
  const s = (raw ?? "").toString().trim();
  if (!s) return { original: null, canonical: null, host: null, is_blocked: false, reason: "empty" };
  let candidate = s;
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  let u: URL;
  try { u = new URL(candidate); }
  catch { return { original: s, canonical: null, host: null, is_blocked: false, reason: "invalid_url" }; }
  const host = u.hostname.toLowerCase();
  if (!host.includes(".")) {
    return { original: s, canonical: null, host, is_blocked: false, reason: "invalid_host" };
  }
  if (BLOCKED_DOMAINS.has(host) || [...BLOCKED_DOMAINS].some(b => host.endsWith(`.${b}`))) {
    return { original: s, canonical: null, host, is_blocked: true, reason: "directory_or_social" };
  }
  // Prefer https + naked host (drop leading www.)
  const naked = host.replace(/^www\./, "");
  const canonical = `https://${naked}`;
  return { original: s, canonical, host: naked, is_blocked: false };
}

// ---------- Cloudflare data-cfemail XOR decode ----------
// Reference: standard Cloudflare email-protection scheme.

export function decodeCfEmail(hex: string): string | null {
  if (!hex || hex.length < 4 || hex.length % 2 !== 0) return null;
  try {
    const r = parseInt(hex.slice(0, 2), 16);
    let out = "";
    for (let i = 2; i < hex.length; i += 2) {
      out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ r);
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out) ? out.toLowerCase() : null;
  } catch { return null; }
}

// ---------- Extractors ----------

export type ExtractionMethod =
  | "tel_href" | "mailto_href" | "visible_text_phone" | "visible_text_email"
  | "json_ld" | "data_cfemail" | "obfuscated_text_email" | "postal_code" | "address_line" | "rbq_declared";

export type ExtractedField = {
  kind: "phone" | "email" | "postal_code" | "address" | "rbq" | "org_name" | "person_name";
  raw: string;
  normalized: string | null;
  method: ExtractionMethod;
  snippet?: string;
};

const TEL_HREF_RE = /href=["']tel:([^"']+)["']/gi;
const MAILTO_RE = /href=["']mailto:([^"'?]+)/gi;
const CFEMAIL_RE = /data-cfemail=["']([0-9a-fA-F]+)["']/gi;
const PHONE_TEXT_RE = /(?:\+?1[\s.\-])?\(?([2-9]\d{2})\)?[\s.\-]?([2-9]\d{2})[\s.\-]?(\d{4})\b/g;
const EMAIL_TEXT_RE = /\b([\w.+-]+)@([\w-]+(?:\.[\w-]+)+)\b/g;
const OBFUSCATED_EMAIL_RE = /\b([\w.+-]+)\s*(?:\(|\[)\s*at\s*(?:\)|\])\s*([\w-]+(?:\s*(?:\(|\[)\s*dot\s*(?:\)|\])\s*[\w-]+)+)\b/gi;
const QC_POSTAL_RE = /\b([A-Z]\d[A-Z])[ \-]?(\d[A-Z]\d)\b/g;
const RBQ_RE = /\b(\d{4}[-\s]?\d{4}[-\s]?\d{2})\b/g;
const JSON_LD_RE = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function normPhoneStrict(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === "1") return `+${d}`;
  return null;
}

function normEmail(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
}

export function extractFieldsFromHtml(html: string): ExtractedField[] {
  const out: ExtractedField[] = [];
  const seen = new Set<string>();
  const push = (f: ExtractedField) => {
    const k = `${f.kind}:${f.normalized ?? f.raw}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(f);
  };

  // tel:
  for (const m of html.matchAll(TEL_HREF_RE)) {
    const n = normPhoneStrict(m[1]);
    if (n) push({ kind: "phone", raw: m[1], normalized: n, method: "tel_href" });
  }
  // mailto:
  for (const m of html.matchAll(MAILTO_RE)) {
    const e = normEmail(m[1]);
    if (e) push({ kind: "email", raw: m[1], normalized: e, method: "mailto_href" });
  }
  // Cloudflare cfemail
  for (const m of html.matchAll(CFEMAIL_RE)) {
    const decoded = decodeCfEmail(m[1]);
    if (decoded) push({ kind: "email", raw: m[1], normalized: decoded, method: "data_cfemail" });
  }
  // visible text — strip tags first
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
  for (const m of visible.matchAll(PHONE_TEXT_RE)) {
    const n = normPhoneStrict(m[0]);
    if (n) push({ kind: "phone", raw: m[0], normalized: n, method: "visible_text_phone" });
  }
  for (const m of visible.matchAll(EMAIL_TEXT_RE)) {
    const e = normEmail(m[0]);
    if (e) push({ kind: "email", raw: m[0], normalized: e, method: "visible_text_email" });
  }
  for (const m of visible.matchAll(OBFUSCATED_EMAIL_RE)) {
    const local = m[1];
    const domain = m[2].replace(/\s*(?:\(|\[)\s*dot\s*(?:\)|\])\s*/gi, ".");
    const e = normEmail(`${local}@${domain}`);
    if (e) push({ kind: "email", raw: m[0], normalized: e, method: "obfuscated_text_email" });
  }
  for (const m of visible.matchAll(QC_POSTAL_RE)) {
    push({ kind: "postal_code", raw: m[0], normalized: `${m[1]} ${m[2]}`.toUpperCase(), method: "postal_code" });
  }
  for (const m of visible.matchAll(RBQ_RE)) {
    const digits = m[1].replace(/\D/g, "");
    if (digits.length === 10) {
      push({
        kind: "rbq",
        raw: m[1],
        normalized: `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`,
        method: "rbq_declared",
      });
    }
  }

  // JSON-LD
  for (const m of html.matchAll(JSON_LD_RE)) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) extractJsonLd(node, push);
    } catch { /* ignore malformed json-ld */ }
  }
  return out;
}

function extractJsonLd(node: any, push: (f: ExtractedField) => void) {
  if (!node || typeof node !== "object") return;
  const graph = node["@graph"];
  if (Array.isArray(graph)) for (const g of graph) extractJsonLd(g, push);
  const type = String(node["@type"] ?? "").toLowerCase();
  if (type.includes("organization") || type.includes("localbusiness") || type.includes("contractor")) {
    if (typeof node.name === "string") push({ kind: "org_name", raw: node.name, normalized: node.name.trim(), method: "json_ld" });
    if (typeof node.telephone === "string") {
      const n = normPhoneStrict(node.telephone);
      if (n) push({ kind: "phone", raw: node.telephone, normalized: n, method: "json_ld" });
    }
    if (typeof node.email === "string") {
      const e = normEmail(node.email);
      if (e) push({ kind: "email", raw: node.email, normalized: e, method: "json_ld" });
    }
    const addr = node.address;
    if (addr && typeof addr === "object") {
      const line = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode].filter(Boolean).join(", ");
      if (line) push({ kind: "address", raw: line, normalized: line, method: "json_ld" });
      if (typeof addr.postalCode === "string") {
        const m = addr.postalCode.toUpperCase().match(/([A-Z]\d[A-Z])\s?(\d[A-Z]\d)/);
        if (m) push({ kind: "postal_code", raw: addr.postalCode, normalized: `${m[1]} ${m[2]}`, method: "json_ld" });
      }
    }
    const cp = node.contactPoint;
    if (Array.isArray(cp)) for (const c of cp) extractJsonLd(c, push);
    else if (cp) extractJsonLd(cp, push);
  }
}

// ---------- Crawl ----------

export const CANDIDATE_PATHS = [
  "", "/contact", "/contact-us", "/contactez-nous", "/nous-joindre",
  "/about", "/a-propos", "/about-us", "/qui-sommes-nous",
  "/services", "/team", "/equipe", "/company", "/entreprise",
] as const;

/** Hard page budget for the acquisition flow. */
export const MAX_ACQUISITION_PAGES = 5;
export const UNPRO_USER_AGENT = "UNPRO-Enrichment/1.1 (+https://unpro.ca)";

export type FetchResult = {
  url: string;
  status: number | null;
  ok: boolean;
  html: string | null;
  content_type: string | null;
  fetched_at: string;
  final_url: string | null;
  reason?: string;
};

const MAX_BYTES = 800_000;
const TIMEOUT_MS = 9_000;
const MAX_REDIRECTS = 3;

/* ---------- robots.txt ---------- */

export type RobotsRules = { disallow: string[]; allow: string[] };

/**
 * Parse robots.txt for the UNPRO agent, falling back to `*`.
 * An agent-specific group wins over the wildcard group entirely.
 */
export function parseRobots(txt: string, agent = "unpro-enrichment"): RobotsRules {
  const lines = txt.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim()).filter(Boolean);
  const groups: Array<{ agents: string[]; allow: string[]; disallow: string[] }> = [];
  let current: { agents: string[]; allow: string[]; disallow: string[] } | null = null;
  let lastWasAgent = false;

  for (const line of lines) {
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) { current = { agents: [], allow: [], disallow: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "disallow") current.disallow.push(value);
    else if (key === "allow") current.allow.push(value);
  }

  const specific = groups.find((g) => g.agents.some((a) => agent.startsWith(a) || a === agent));
  const wildcard = groups.find((g) => g.agents.includes("*"));
  const chosen = specific ?? wildcard;
  return { disallow: chosen?.disallow ?? [], allow: chosen?.allow ?? [] };
}

function matchesRule(path: string, rule: string): boolean {
  if (rule === "") return false; // "Disallow:" (empty) = allow everything
  const escaped = rule.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const anchored = escaped.endsWith("$") ? `^${escaped}` : `^${escaped}`;
  try { return new RegExp(anchored).test(path); } catch { return path.startsWith(rule); }
}

export function isAllowedByRobots(rules: RobotsRules, path: string): boolean {
  const longest = (arr: string[]) =>
    arr.filter((r) => matchesRule(path, r)).sort((a, b) => b.length - a.length)[0] ?? null;
  const a = longest(rules.allow);
  const d = longest(rules.disallow);
  if (d === null) return true;
  if (a === null) return false;
  return a.length >= d.length;
}

export async function fetchRobots(origin: string): Promise<RobotsRules> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5_000);
    const r = await fetch(new URL("/robots.txt", origin).toString(), {
      signal: ctrl.signal,
      headers: { "User-Agent": UNPRO_USER_AGENT },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!r.ok) return { disallow: [], allow: [] };
    const txt = await r.text();
    return parseRobots(txt);
  } catch {
    return { disallow: [], allow: [] };
  }
}

/** Fetch a single page. Redirects are followed manually and ONLY within the same host. */
export async function fetchPage(url: string, ua = UNPRO_USER_AGENT): Promise<FetchResult> {
  const started = new Date().toISOString();
  const originHost = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; } })();
  if (!originHost) {
    return { url, status: null, ok: false, html: null, content_type: null, fetched_at: started, final_url: null, reason: "invalid_url" };
  }

  let target = url;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const r = await fetch(target, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "User-Agent": ua, "Accept": "text/html,application/xhtml+xml" },
      });
      clearTimeout(t);

      if (r.status >= 300 && r.status < 400) {
        const loc = r.headers.get("location");
        if (!loc) return { url, status: r.status, ok: false, html: null, content_type: null, fetched_at: started, final_url: target, reason: "redirect_without_location" };
        const next = new URL(loc, target);
        if (next.hostname.replace(/^www\./, "") !== originHost) {
          return { url, status: r.status, ok: false, html: null, content_type: null, fetched_at: started, final_url: next.toString(), reason: "cross_domain_redirect" };
        }
        target = next.toString();
        continue;
      }

      const ct = r.headers.get("content-type") ?? "";
      if (!r.ok) return { url, status: r.status, ok: false, html: null, content_type: ct, fetched_at: started, final_url: target, reason: `http_${r.status}` };
      if (!ct.includes("text") && !ct.includes("html")) return { url, status: r.status, ok: false, html: null, content_type: ct, fetched_at: started, final_url: target, reason: `content_type_${ct}` };
      const buf = await r.arrayBuffer();
      if (buf.byteLength > MAX_BYTES * 2) {
        return { url, status: r.status, ok: false, html: null, content_type: ct, fetched_at: started, final_url: target, reason: "too_large" };
      }
      const html = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, MAX_BYTES));
      return { url, status: r.status, ok: true, html, content_type: ct, fetched_at: started, final_url: target };
    }
    return { url, status: null, ok: false, html: null, content_type: null, fetched_at: started, final_url: target, reason: "too_many_redirects" };
  } catch (e) {
    const reason = e instanceof DOMException && e.name === "AbortError" ? "timeout" : "fetch_failed";
    return { url, status: null, ok: false, html: null, content_type: null, fetched_at: started, final_url: null, reason };
  }
}

export type CrawlSummary = {
  canonical_domain: string;
  pages_attempted: FetchResult[];
  ok_pages: FetchResult[];
  fields: Array<ExtractedField & { source_url: string }>;
  complete: boolean;
  had_transient_failure: boolean;
  robots_blocked: string[];
};

export async function crawlOfficialSite(
  domain: string,
  opts?: { maxPages?: number; respectRobots?: boolean },
): Promise<CrawlSummary> {
  const resolved = resolveOfficialDomain(domain);
  if (!resolved.canonical) {
    return {
      canonical_domain: domain,
      pages_attempted: [],
      ok_pages: [],
      fields: [],
      complete: false,
      had_transient_failure: false,
      robots_blocked: [],
    };
  }
  const maxPages = Math.min(opts?.maxPages ?? MAX_ACQUISITION_PAGES, MAX_ACQUISITION_PAGES);
  const base = new URL(resolved.canonical);
  const attempted: FetchResult[] = [];
  const okPages: FetchResult[] = [];
  const fields: Array<ExtractedField & { source_url: string }> = [];
  const robotsBlocked: string[] = [];
  let hadTransient = false;

  const rules = opts?.respectRobots === false ? { allow: [], disallow: [] } : await fetchRobots(base.origin);

  for (let i = 0; i < CANDIDATE_PATHS.length && attempted.length < maxPages; i++) {
    const path = CANDIDATE_PATHS[i] || "/";
    if (!isAllowedByRobots(rules, path)) { robotsBlocked.push(path); continue; }
    const target = new URL(path, base).toString();
    const r = await fetchPage(target);
    attempted.push(r);
    if (r.reason === "timeout" || r.reason === "fetch_failed" || (r.status && r.status >= 500)) {
      hadTransient = true;
    }
    if (r.ok && r.html) {
      okPages.push(r);
      const extracted = extractFieldsFromHtml(r.html);
      for (const f of extracted) fields.push({ ...f, source_url: r.final_url ?? r.url });
    }
  }
  const complete = attempted.length > 0 && attempted.every(a => a.ok || (a.status !== null && a.status < 500 && a.reason !== "timeout"));
  return {
    canonical_domain: resolved.canonical,
    pages_attempted: attempted,
    ok_pages: okPages,
    fields,
    complete,
    had_transient_failure: hadTransient,
    robots_blocked: robotsBlocked,
  };
}

// ---------- Identity verification ----------

export type IdentityExpectation = {
  business_name_norm: string;
  postal_code?: string | null;
  rbq_license?: string | null;
  city?: string | null;
};

export type IdentityVerdict = {
  verified: boolean;
  score: number;
  signals: string[];
  conflict: string | null;
};

function normText(s: string | null | undefined): string {
  return (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Confirm that the crawled site belongs to the expected company before any
 * contact is accepted as source_confirmed.
 */
export function verifyIdentity(
  fields: Array<ExtractedField & { source_url?: string }>,
  expected: IdentityExpectation,
  pageText?: string,
): IdentityVerdict {
  const signals: string[] = [];
  let score = 0;
  let conflict: string | null = null;

  const orgNames = fields.filter(f => f.kind === "org_name").map(f => normText(f.normalized ?? f.raw));
  const haystack = `${orgNames.join(" ")} ${normText(pageText ?? "")}`;
  const tokens = expected.business_name_norm.split(" ").filter(t => t.length > 2);
  const hits = tokens.filter(t => haystack.includes(t)).length;
  if (tokens.length > 0 && hits / tokens.length >= 0.5) { score += 50; signals.push("org_name_match"); }

  if (expected.rbq_license) {
    const rbqs = fields.filter(f => f.kind === "rbq").map(f => f.normalized);
    if (rbqs.includes(expected.rbq_license)) { score += 30; signals.push("rbq_match"); }
    else if (rbqs.length > 0) conflict = "rbq_conflict";
  }
  if (expected.postal_code) {
    const postals = fields.filter(f => f.kind === "postal_code").map(f => (f.normalized ?? "").toUpperCase());
    if (postals.includes(expected.postal_code.toUpperCase())) { score += 20; signals.push("postal_match"); }
  }
  if (expected.city && haystack.includes(normText(expected.city))) { score += 10; signals.push("city_match"); }

  return { verified: !conflict && score >= 50, score: Math.min(score, 100), signals, conflict };
}


// ---------- Trust precedence ----------

export type TrustState = "externally_verified" | "source_confirmed" | "declared" | "inferred" | "pending_verification";
const TRUST_ORDER: Record<TrustState, number> = {
  externally_verified: 4,
  source_confirmed: 3,
  declared: 2,
  inferred: 1,
  pending_verification: 0,
};

export function shouldOverride(currentTrust: TrustState | null | undefined, incoming: TrustState): boolean {
  if (!currentTrust) return true;
  return TRUST_ORDER[incoming] > TRUST_ORDER[currentTrust];
}
