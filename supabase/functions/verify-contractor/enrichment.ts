/**
 * verify-contractor / enrichment
 * ------------------------------
 * Real server-side public enrichment for contractor identity resolution.
 *
 * Rules:
 *  - never fabricate data: every returned datum carries its source + method;
 *  - a provider failure is reported as `provider_error`, never as `no_record`;
 *  - bounded crawling (same domain, small page budget, robots-aware) via the
 *    canonical officialSiteCrawler shared module;
 *  - Google Places is used only through the existing server-side connector.
 */

import {
  crawlOfficialSite,
  resolveOfficialDomain,
  type CrawlSummary,
} from "../_shared/officialSiteCrawler.ts";
import { placesSearchTextRaw } from "../_shared/googleMapsConnector.ts";

export type SourceStatus = "ok" | "no_record" | "provider_error" | "skipped";

export interface SourceOutcome {
  /** Stable machine id of the source, e.g. "site_web_officiel". */
  source: string;
  /** User-safe label shown on the public page. */
  label: string;
  status: SourceStatus;
  /** User-safe one-line detail (never a stack trace, never a secret). */
  detail: string;
}

export interface EvidenceItem {
  field:
    | "business_name"
    | "phone"
    | "email"
    | "address"
    | "city"
    | "postal_code"
    | "website"
    | "rbq_mention"
    | "neq_mention"
    | "social"
    | "rating"
    | "review_count";
  value: string;
  source: string;
  source_url: string | null;
  method: string;
  confidence: "high" | "medium" | "low";
}

export interface EnrichmentResult {
  evidence: EvidenceItem[];
  sources: SourceOutcome[];
  identified_name: string | null;
  domain: string | null;
}

/** Normalize a domain input: strip protocol, www, path, query, trailing slash. */
export function normalizeDomain(raw: string | null | undefined): string | null {
  const s = (raw ?? "").toString().trim();
  if (!s) return null;
  const host = s
    .replace(/^[a-z]+:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[/?#]/)[0]
    .toLowerCase()
    .trim();
  if (!host || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) return null;
  return host;
}

const SOCIAL_RE =
  /https?:\/\/(?:www\.)?(facebook\.com|instagram\.com|linkedin\.com|youtube\.com|tiktok\.com)\/[^\s"'<>]+/gi;
const NEQ_RE = /\bNEQ\D{0,12}(\d{10})\b/gi;
const TITLE_RE = /<title[^>]*>([^<]{2,120})<\/title>/i;
const OG_SITE_RE = /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']{2,120})["']/i;

function cleanName(raw: string): string {
  return raw
    .replace(/\s*[|\-–—]\s*(accueil|home|bienvenue).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract a probable company name from a crawled homepage. */
export function extractCompanyName(html: string): { value: string; method: string } | null {
  const og = html.match(OG_SITE_RE);
  if (og?.[1]) return { value: cleanName(og[1]), method: "meta_og_site_name" };
  const t = html.match(TITLE_RE);
  if (t?.[1]) {
    const cleaned = cleanName(t[1]);
    if (cleaned.length >= 2) return { value: cleaned, method: "html_title" };
  }
  return null;
}

export function extractSocialLinks(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(SOCIAL_RE)) out.add(m[0].replace(/[),.]+$/, ""));
  return [...out].slice(0, 6);
}

export function extractNeqMentions(html: string): string[] {
  const text = html.replace(/<[^>]+>/g, " ");
  const out = new Set<string>();
  for (const m of text.matchAll(NEQ_RE)) out.add(m[1]);
  return [...out].slice(0, 3);
}

/** Crawl the public website and convert findings into sourced evidence. */
export async function enrichFromWebsite(rawDomain: string): Promise<EnrichmentResult> {
  const resolved = resolveOfficialDomain(rawDomain);
  const evidence: EvidenceItem[] = [];
  const sources: SourceOutcome[] = [];
  const label = "Site web public";

  if (!resolved.canonical) {
    sources.push({
      source: "site_web_officiel",
      label,
      status: "skipped",
      detail: resolved.is_blocked
        ? "Ce lien pointe vers un annuaire ou un réseau social, pas vers un site d'entreprise."
        : "Adresse de site web non exploitable.",
    });
    return { evidence, sources, identified_name: null, domain: null };
  }

  let crawl: CrawlSummary;
  try {
    crawl = await crawlOfficialSite(resolved.canonical, { maxPages: 5 });
  } catch (e) {
    sources.push({
      source: "site_web_officiel",
      label,
      status: "provider_error",
      detail: "Le site n'a pas pu être consulté (erreur technique de récupération).",
    });
    console.error("[verify-contractor] crawl exception", e instanceof Error ? e.message : e);
    return { evidence, sources, identified_name: null, domain: resolved.host };
  }

  const okPages = crawl.ok_pages;
  if (okPages.length === 0) {
    const transient = crawl.had_transient_failure;
    sources.push({
      source: "site_web_officiel",
      label,
      status: transient ? "provider_error" : "no_record",
      detail: transient
        ? "Le site n'a pas répondu à temps. Ce n'est pas une absence d'information."
        : "Aucune page publique lisible sur ce domaine.",
    });
    return { evidence, sources, identified_name: null, domain: resolved.host };
  }

  const push = (item: EvidenceItem) => {
    if (evidence.some((e) => e.field === item.field && e.value === item.value)) return;
    evidence.push(item);
  };

  for (const f of crawl.fields) {
    const base = {
      source: "site_web_officiel",
      source_url: f.source_url,
      method: f.method,
      confidence: (f.method === "json_ld" ? "high" : "medium") as EvidenceItem["confidence"],
    };
    if (f.kind === "phone" && f.normalized) push({ field: "phone", value: f.normalized, ...base });
    else if (f.kind === "email" && f.normalized) push({ field: "email", value: f.normalized, ...base });
    else if (f.kind === "address" && f.normalized) push({ field: "address", value: f.normalized, ...base });
    else if (f.kind === "postal_code" && f.normalized)
      push({ field: "postal_code", value: f.normalized, ...base });
    else if (f.kind === "rbq" && f.normalized)
      push({ field: "rbq_mention", value: f.normalized, ...base, confidence: "low" });
    else if (f.kind === "org_name" && f.normalized)
      push({ field: "business_name", value: f.normalized, ...base, confidence: "high" });
  }

  const homepage = okPages[0];
  const html = homepage.html ?? "";
  if (!evidence.some((e) => e.field === "business_name")) {
    const name = extractCompanyName(html);
    if (name) {
      push({
        field: "business_name",
        value: name.value,
        source: "site_web_officiel",
        source_url: homepage.final_url ?? homepage.url,
        method: name.method,
        confidence: "medium",
      });
    }
  }
  for (const link of extractSocialLinks(html)) {
    push({
      field: "social",
      value: link,
      source: "site_web_officiel",
      source_url: homepage.final_url ?? homepage.url,
      method: "social_link",
      confidence: "medium",
    });
  }
  for (const neq of extractNeqMentions(html)) {
    push({
      field: "neq_mention",
      value: neq,
      source: "site_web_officiel",
      source_url: homepage.final_url ?? homepage.url,
      method: "neq_declared",
      confidence: "low",
    });
  }
  push({
    field: "website",
    value: resolved.canonical,
    source: "site_web_officiel",
    source_url: homepage.final_url ?? homepage.url,
    method: "input_domain_reachable",
    confidence: "high",
  });

  sources.push({
    source: "site_web_officiel",
    label,
    status: "ok",
    detail: `${okPages.length} page(s) publique(s) analysée(s) sur ${resolved.host}.`,
  });

  const identified =
    evidence.find((e) => e.field === "business_name" && e.confidence === "high") ??
    evidence.find((e) => e.field === "business_name");

  return {
    evidence,
    sources,
    identified_name: identified?.value ?? null,
    domain: resolved.host,
  };
}

/** Google Places lookup through the existing connector. Never invents data. */
export async function enrichFromPlaces(query: string): Promise<EnrichmentResult> {
  const evidence: EvidenceItem[] = [];
  const sources: SourceOutcome[] = [];
  const label = "Google Maps (fiche publique)";
  const trimmed = query.trim();

  if (trimmed.length < 3) {
    sources.push({
      source: "google_places",
      label,
      status: "skipped",
      detail: "Pas assez d'information pour interroger les fiches publiques.",
    });
    return { evidence, sources, identified_name: null, domain: null };
  }

  let res: Awaited<ReturnType<typeof placesSearchTextRaw>>;
  try {
    res = await placesSearchTextRaw(
      trimmed,
      { maxResults: 3, region: "CA", language: "fr-CA" },
      "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount",
    );
  } catch (e) {
    console.error("[verify-contractor] places exception", e instanceof Error ? e.message : e);
    sources.push({
      source: "google_places",
      label,
      status: "provider_error",
      detail: "La recherche de fiche publique a échoué temporairement.",
    });
    return { evidence, sources, identified_name: null, domain: null };
  }

  if (res.source === "missing_connector") {
    sources.push({
      source: "google_places",
      label,
      status: "skipped",
      detail: "Source de fiches publiques non configurée sur ce serveur.",
    });
    return { evidence, sources, identified_name: null, domain: null };
  }
  if (res.google_status === "FETCH_ERROR") {
    sources.push({
      source: "google_places",
      label,
      status: "provider_error",
      detail: "La source de fiches publiques a retourné une erreur. Ce n'est pas une absence de fiche.",
    });
    return { evidence, sources, identified_name: null, domain: null };
  }

  const place = res.places[0];
  if (!place) {
    sources.push({
      source: "google_places",
      label,
      status: "no_record",
      detail: "Aucune fiche publique correspondante trouvée.",
    });
    return { evidence, sources, identified_name: null, domain: null };
  }

  const url = place.id ? `https://www.google.com/maps/place/?q=place_id:${place.id}` : null;
  const add = (field: EvidenceItem["field"], value: string | null | undefined, conf: EvidenceItem["confidence"] = "high") => {
    if (!value) return;
    evidence.push({ field, value: String(value), source: "google_places", source_url: url, method: "places_search_text", confidence: conf });
  };
  const name = place.displayName?.text ?? null;
  add("business_name", name);
  add("address", place.formattedAddress);
  add("phone", place.nationalPhoneNumber);
  add("website", place.websiteUri);
  if (typeof place.rating === "number") add("rating", String(place.rating));
  if (typeof place.userRatingCount === "number") add("review_count", String(place.userRatingCount));

  sources.push({
    source: "google_places",
    label,
    status: "ok",
    detail: "Fiche publique correspondante trouvée.",
  });

  return { evidence, sources, identified_name: name, domain: null };
}

export function mergeEnrichment(...parts: EnrichmentResult[]): EnrichmentResult {
  const evidence: EvidenceItem[] = [];
  const sources: SourceOutcome[] = [];
  let identified: string | null = null;
  let domain: string | null = null;
  for (const p of parts) {
    for (const e of p.evidence) {
      if (!evidence.some((x) => x.field === e.field && x.value === e.value && x.source === e.source)) {
        evidence.push(e);
      }
    }
    for (const s of p.sources) if (!sources.some((x) => x.source === s.source)) sources.push(s);
    identified = identified ?? p.identified_name;
    domain = domain ?? p.domain;
  }
  return { evidence, sources, identified_name: identified, domain };
}
