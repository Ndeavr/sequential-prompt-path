/**
 * Owner-authenticated public website reading for the contractor matching draft.
 *
 * - Auth + draft ownership + persistent rate limit are checked BEFORE any
 *   website request (see runOwnerWebsiteAnalysis).
 * - Only the existing pinned transport is accepted (DNS validated, socket
 *   pinned to the validated public IPv4, no unpinned fallback).
 * - HTTPS public hosts only, same-site redirects re-validated, robots.txt
 *   respected, at most 3 pages, byte and time caps.
 * - Site text is untrusted data. Nothing here is a declaration, a licence,
 *   a verification or consent; suggestions stay separate until the owner
 *   explicitly applies them in the wizard. No paid provider, no AI model.
 */
import { safeUrl, publicAddress, PINNED_TRANSPORT } from "../enrich-official-website/caslFirstParty.ts";
import { extractFieldsFromHtml, parseRobots, isAllowedByRobots, type RobotsRules } from "../_shared/officialSiteCrawler.ts";

export const ANALYSIS_POLICY = {
  version: "owner-website-analysis-v1",
  maxPages: 3,
  maxBytes: 250_000,
  perRequestMs: 4_000,
  deadlineMs: 15_000,
  maxRedirects: 2,
  perHour: 5,
  perDay: 10,
} as const;
/** Server-owned key inside the draft answers. Clients can never write it. */
export const ANALYSIS_KEY = "_website_analysis";
export const ANALYSIS_OPERATION = "contractor_website_analysis";
const USER_AGENT = "UNPRO-Enrichment/1.1 (+https://unpro.ca)";

export type AnalysisIO = { fetch: typeof fetch; resolve: (host: string) => Promise<string[]>; now?: () => number };
export type SuggestionMethod = "json_ld" | "meta" | "title" | "page_heading";
export type Suggestion = { value: string; method: SuggestionMethod; page: string };
export type WebsiteAnalysis = {
  status: "succeeded" | "failed";
  reason: string | null;
  source_url: string;
  checked_at: string;
  pages: { url: string; fetched_at: string }[];
  suggestions: { business_name: Suggestion | null; description: Suggestion | null; services: Suggestion[]; territories: Suggestion[] };
  policy_version: string;
  /** Suggestions are never declarations; the owner applies them explicitly. */
  applied: false;
};

const KNOWN_FAILURES = new Set([
  "unsafe_source", "unsafe_dns", "robots_blocked", "unreachable", "redirect_outside_site", "redirect_limit",
  "not_html", "volume_limit", "timeout", "empty_page", "unpinned_transport", "dns_timeout", "aborted",
]);
function reasonOf(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "aborted" || message === "dns_timeout") return "timeout";
  return KNOWN_FAILURES.has(message) ? message : "unreachable";
}
const naked = (host: string) => host.toLowerCase().replace(/^www\./, "");

/** Normalises the saved website to an https URL accepted by the safe-URL policy. Throws unsafe_source. */
export function safeStartUrl(raw: unknown): URL {
  if (typeof raw !== "string" || !raw.trim()) throw new Error("unsafe_source");
  const trimmed = raw.trim();
  const https = /^https?:\/\//i.test(trimmed) ? trimmed.replace(/^http:\/\//i, "https://") : `https://${trimmed}`;
  try { return safeUrl(https); } catch { throw new Error("unsafe_source"); }
}

async function assertPublicDns(host: string, io: AnalysisIO) {
  const ips = await io.resolve(host);
  if (!ips.length || ips.some(ip => !publicAddress(ip))) throw new Error("unsafe_dns");
}

async function readPage(raw: string, siteHost: string, io: AnalysisIO, deadline: AbortSignal, plain = false): Promise<{ url: string; body: string } | null> {
  if ((io.fetch as unknown as Record<symbol, unknown>)[PINNED_TRANSPORT] !== true) throw new Error("unpinned_transport");
  let url: URL;
  try { url = safeUrl(raw); } catch { throw new Error("unsafe_source"); }
  if (naked(url.hostname) !== siteHost) throw new Error("redirect_outside_site");
  for (let hop = 0; ; hop++) {
    if (deadline.aborted) throw new Error("timeout");
    await assertPublicDns(url.hostname, io);
    const ctrl = new AbortController();
    const stop = () => ctrl.abort();
    deadline.addEventListener("abort", stop, { once: true });
    const timer = setTimeout(stop, ANALYSIS_POLICY.perRequestMs);
    try {
      let response: Response;
      try {
        response = await io.fetch(url.toString(), { redirect: "manual", signal: ctrl.signal, headers: { "User-Agent": USER_AGENT, Accept: "text/html,text/plain" } });
      } catch (error) {
        throw new Error(ctrl.signal.aborted ? "timeout" : reasonOf(error));
      }
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel();
        const location = response.headers.get("location");
        if (!location) throw new Error("unreachable");
        if (hop >= ANALYSIS_POLICY.maxRedirects) throw new Error("redirect_limit");
        let next: URL;
        try { next = safeUrl(new URL(location, url).toString()); } catch { throw new Error("redirect_outside_site"); }
        if (naked(next.hostname) !== siteHost) throw new Error("redirect_outside_site");
        url = next;
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        if (plain) return null;
        throw new Error("unreachable");
      }
      const type = response.headers.get("content-type") ?? "";
      if (!type.includes(plain ? "text/" : "text/html")) { await response.body?.cancel(); if (plain) return null; throw new Error("not_html"); }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("empty_page");
      let bytes = 0, out = "";
      const decoder = new TextDecoder();
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.length;
          if (bytes > ANALYSIS_POLICY.maxBytes) throw new Error("volume_limit");
          out += decoder.decode(chunk.value, { stream: true });
        }
        out += decoder.decode();
      } catch (error) {
        throw new Error(ctrl.signal.aborted ? "timeout" : reasonOf(error));
      } finally { await reader.cancel().catch(() => undefined); }
      if (!plain && !out.trim()) throw new Error("empty_page");
      return { url: url.toString(), body: out };
    } finally {
      clearTimeout(timer);
      deadline.removeEventListener("abort", stop);
    }
  }
}

// ---------------------------------------------------------------- parsing
function decode(s: string): string {
  return s
    .replace(/&#(\d{1,6});/g, (_, n) => { const c = Number(n); return c > 31 && c < 0x10ffff ? String.fromCodePoint(c) : " "; })
    .replace(/&#x([\da-f]{1,6});/gi, (_, n) => { const c = parseInt(n, 16); return c > 31 && c < 0x10ffff ? String.fromCodePoint(c) : " "; })
    .replace(/&nbsp;/gi, " ").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&");
}
/** Plain, bounded text. Markup, control characters and URLs never survive. */
export function cleanText(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  const s = decode(raw.replace(/<[^>]*>/g, " "))
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e]/g, " ")
    .replace(/\s+/g, " ").trim();
  if (s.length < 2) return "";
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}
function metaTags(html: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attr = (name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
    const key = attr("name") ?? attr("property");
    const content = attr("content");
    const k = (key?.[1] ?? key?.[2] ?? "").toLowerCase();
    const v = content?.[1] ?? content?.[2] ?? "";
    if (k && v && !out.has(k)) out.set(k, v);
  }
  return out;
}
const JSON_LD_RE = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
function jsonLdNodes(html: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  const walk = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > 6 || nodes.length > 200) return;
    if (Array.isArray(node)) { for (const n of node) walk(n, depth + 1); return; }
    const obj = node as Record<string, unknown>;
    nodes.push(obj);
    if (obj["@graph"]) walk(obj["@graph"], depth + 1);
  };
  for (const m of html.matchAll(JSON_LD_RE)) {
    try { walk(JSON.parse(m[1].trim()), 0); } catch { /* malformed JSON-LD is ignored */ }
  }
  return nodes;
}
const isBusiness = (node: Record<string, unknown>) => {
  const t = [node["@type"]].flat().map(v => String(v ?? "").toLowerCase()).join(" ");
  return /organization|business|contractor|plumber|electrician|roofing|hvac|locksmith|painter|movingcompany|generalcontractor/.test(t);
};
function names(value: unknown, depth = 0): string[] {
  if (depth > 4 || value === null || value === undefined) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(v => names(v, depth + 1));
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.name === "string") return [o.name];
    if (o.itemOffered) return names(o.itemOffered, depth + 1);
    if (o.itemListElement) return names(o.itemListElement, depth + 1);
  }
  return [];
}
const SKIP_HEADING = /^(?:nos services|our services|services|contact(?:ez)?(?:-nous)?|nous joindre|soumission(?: gratuite)?|demande de soumission|get a quote|free quote|accueil|home|à propos|a propos|about(?: us)?|témoignages|testimonials|avis|reviews|blog|faq|menu|réalisations|portfolio|nos réalisations|appelez(?:-nous)?|call us)$/i;
const SERVICE_PATH = /(?:^|\/)(?:services?|nos-services|our-services|expertises?|specialites|specialties)(?:\/|$|-|\.)/i;
const AREA_PATH = /(?:^|\/)(?:territoires?|zones?|secteurs?|service-areas?|regions?)(?:\/|$|-|\.)/i;
const ABOUT_PATH = /(?:^|\/)(?:a-propos|about|about-us|qui-sommes-nous|entreprise)(?:\/|$|-|\.)/i;

type Parts = { name: Suggestion[]; description: Suggestion[]; services: Suggestion[]; territories: Suggestion[] };
export function extractSuggestions(html: string, page: string, isServicePage: boolean): Parts {
  const out: Parts = { name: [], description: [], services: [], territories: [] };
  const push = (list: Suggestion[], raw: unknown, method: SuggestionMethod, max: number) => {
    const value = cleanText(raw, max);
    if (value && !/https?:\/\//i.test(value)) list.push({ value, method, page });
  };
  // Existing canonical extractor: JSON-LD organisation name only (contacts and
  // licence numbers are deliberately ignored here).
  for (const f of extractFieldsFromHtml(html)) if (f.kind === "org_name") push(out.name, f.normalized ?? f.raw, "json_ld", 160);
  for (const node of jsonLdNodes(html)) {
    const type = [node["@type"]].flat().map(v => String(v ?? "").toLowerCase());
    if (isBusiness(node)) {
      push(out.description, node.description, "json_ld", 600);
      for (const a of names(node.areaServed)) push(out.territories, a, "json_ld", 80);
      const address = node.address as Record<string, unknown> | undefined;
      if (address && typeof address === "object") push(out.territories, address.addressLocality, "json_ld", 80);
      for (const s of [...names(node.makesOffer), ...names(node.hasOfferCatalog)]) push(out.services, s, "json_ld", 80);
    }
    if (type.includes("service")) {
      for (const s of [...names(node.serviceType), ...names(node.name)]) push(out.services, s, "json_ld", 80);
      for (const a of names(node.areaServed)) push(out.territories, a, "json_ld", 80);
    }
  }
  const meta = metaTags(html);
  push(out.name, meta.get("og:site_name"), "meta", 160);
  push(out.description, meta.get("description") ?? meta.get("og:description"), "meta", 600);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) push(out.name, decode(title).split(/\s[|–—-]\s/)[0], "title", 160);
  if (isServicePage) {
    for (const m of html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)) {
      const value = cleanText(m[1], 80);
      if (value && value.split(" ").length <= 8 && !SKIP_HEADING.test(value) && !/[?!]$/.test(value)) push(out.services, value, "page_heading", 80);
    }
  }
  return out;
}

function sameSiteLinks(html: string, base: URL, siteHost: string, rules: RobotsRules): string[] {
  const scored: { url: string; score: number }[] = [];
  const seen = new Set([base.toString()]);
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)) {
    let u: URL;
    try { u = safeUrl(new URL(decode(m[1] ?? m[2] ?? ""), base).toString()); } catch { continue; }
    if (naked(u.hostname) !== siteHost) continue;
    u.search = "";
    const key = u.toString();
    if (seen.has(key) || !isAllowedByRobots(rules, u.pathname)) continue;
    const score = SERVICE_PATH.test(u.pathname) ? 3 : AREA_PATH.test(u.pathname) ? 2 : ABOUT_PATH.test(u.pathname) ? 1 : 0;
    if (!score) continue;
    seen.add(key);
    scored.push({ url: key, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, ANALYSIS_POLICY.maxPages - 1).map(s => s.url);
}

function dedupe(list: Suggestion[], max: number): Suggestion[] {
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const s of list) {
    const key = s.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}
const RANK: Record<SuggestionMethod, number> = { json_ld: 0, meta: 1, title: 2, page_heading: 3 };
const best = (list: Suggestion[]) => [...list].sort((a, b) => RANK[a.method] - RANK[b.method])[0] ?? null;

/** Reads 1-3 public pages of the saved website. Never throws. */
export async function analyzeWebsite(rawUrl: unknown, io: AnalysisIO): Promise<WebsiteAnalysis> {
  const now = () => new Date(io.now?.() ?? Date.now()).toISOString();
  const result: WebsiteAnalysis = {
    status: "failed", reason: null, source_url: typeof rawUrl === "string" ? rawUrl.slice(0, 500) : "",
    checked_at: now(), pages: [], suggestions: { business_name: null, description: null, services: [], territories: [] },
    policy_version: ANALYSIS_POLICY.version, applied: false,
  };
  let start: URL;
  try { start = safeStartUrl(rawUrl); } catch (error) { result.reason = reasonOf(error); return result; }
  result.source_url = start.toString();
  const siteHost = naked(start.hostname);
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), ANALYSIS_POLICY.deadlineMs);
  const collected: Parts = { name: [], description: [], services: [], territories: [] };
  try {
    let rules: RobotsRules = { disallow: [], allow: [] };
    try {
      const robots = await readPage(`${start.origin}/robots.txt`, siteHost, io, deadline.signal, true);
      if (robots) rules = parseRobots(robots.body);
    } catch (error) {
      const reason = reasonOf(error);
      if (["unsafe_dns", "unpinned_transport", "unsafe_source"].includes(reason)) throw error;
      // An unreachable robots.txt does not forbid; the home page read decides.
    }
    if (!isAllowedByRobots(rules, start.pathname || "/")) throw new Error("robots_blocked");
    const home = await readPage(start.toString(), siteHost, io, deadline.signal);
    if (!home) throw new Error("unreachable");
    result.pages.push({ url: home.url, fetched_at: now() });
    const homeUrl = new URL(home.url);
    const homeParts = extractSuggestions(home.body, home.url, SERVICE_PATH.test(homeUrl.pathname));
    for (const k of Object.keys(collected) as (keyof Parts)[]) collected[k].push(...homeParts[k]);
    for (const link of sameSiteLinks(home.body, homeUrl, siteHost, rules)) {
      if (deadline.signal.aborted || result.pages.length >= ANALYSIS_POLICY.maxPages) break;
      try {
        const page = await readPage(link, siteHost, io, deadline.signal);
        if (!page) continue;
        result.pages.push({ url: page.url, fetched_at: now() });
        const parts = extractSuggestions(page.body, page.url, SERVICE_PATH.test(new URL(page.url).pathname));
        for (const k of Object.keys(collected) as (keyof Parts)[]) collected[k].push(...parts[k]);
      } catch (error) {
        if (["unsafe_dns", "unpinned_transport"].includes(reasonOf(error))) throw error;
        // A secondary page failure keeps the successful home page reading.
      }
    }
    result.status = "succeeded";
    result.suggestions = {
      business_name: best(collected.name),
      description: best(collected.description),
      services: dedupe(collected.services, 10),
      territories: dedupe(collected.territories, 10),
    };
  } catch (error) {
    result.reason = deadline.signal.aborted ? "timeout" : reasonOf(error);
    result.status = "failed";
  } finally {
    clearTimeout(timer);
  }
  result.checked_at = now();
  return result;
}

// ---------------------------------------------------------------- handler
export type OwnedDraft = { id: string; contractor_id: string | null; answers: Record<string, unknown> | null };
export type AnalysisDeps = {
  userId: string | null;
  ownedContractorId: string | null;
  draft: OwnedDraft | null;
  ledger: {
    /** Inserts the attempt, then returns attempts in the last hour/day (including this one). Throws on failure. */
    start(host: string): Promise<{ id: string; hour: number; day: number }>;
    finish(id: string, outcome: "achieved" | "failed" | "blocked", payload: Record<string, unknown>): Promise<void>;
  };
  /** Merges ONLY the analysis key into the owned draft; false when not saved. */
  persist(draftId: string, analysis: WebsiteAnalysis): Promise<boolean>;
  io: AnalysisIO;
};

/** Auth → ownership → URL policy → persistent rate limit → network → persistence. */
export async function runOwnerWebsiteAnalysis(deps: AnalysisDeps): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!deps.userId) return { status: 401, body: { ok: false, error: "authentication_required" } };
  if (!deps.draft) return { status: 409, body: { ok: false, error: "draft_required" } };
  if (deps.draft.contractor_id && deps.draft.contractor_id !== deps.ownedContractorId) {
    return { status: 403, body: { ok: false, error: "profile_access_denied" } };
  }
  const website = deps.draft.answers?.company_website;
  if (typeof website !== "string" || !website.trim()) return { status: 422, body: { ok: false, error: "website_required" } };
  let host: string;
  try { host = naked(safeStartUrl(website).hostname); } catch { return { status: 422, body: { ok: false, error: "unsafe_source" } }; }

  let attempt: { id: string; hour: number; day: number };
  try { attempt = await deps.ledger.start(host); }
  catch { return { status: 503, body: { ok: false, error: "rate_limit_unavailable" } }; }
  if (attempt.hour > ANALYSIS_POLICY.perHour || attempt.day > ANALYSIS_POLICY.perDay) {
    await deps.ledger.finish(attempt.id, "blocked", { reason: "rate_limited", host });
    return { status: 429, body: { ok: false, error: "rate_limited" } };
  }

  const analysis = await analyzeWebsite(website, deps.io);
  const saved = await deps.persist(deps.draft.id, analysis).catch(() => false);
  if (!saved) {
    await deps.ledger.finish(attempt.id, "failed", { reason: "analysis_not_saved", host, pages: analysis.pages.length });
    return { status: 500, body: { ok: false, error: "analysis_not_saved" } };
  }
  await deps.ledger.finish(attempt.id, analysis.status === "succeeded" ? "achieved" : "failed", {
    reason: analysis.reason, host, pages: analysis.pages.length, policy: ANALYSIS_POLICY.version,
  });
  return { status: 200, body: { ok: analysis.status === "succeeded", analysis } };
}
