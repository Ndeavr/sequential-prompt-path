import { normalizePhone } from "../_shared/normalizePhone.ts";
import { captureCaslEvidence, normalizeCaslDestination, sha256Hex } from "../_shared/caslEvidence.ts";
import { normalizeServiceCategory } from "../_shared/localServiceCategories.ts";
import { resolveOfficialDomain, parseRobots, isAllowedByRobots, UNPRO_USER_AGENT } from "../_shared/officialSiteCrawler.ts";

export const POLICY = { version: "first-party-observation-v1", auto_eligibility_enabled: false, maxPages: 6, maxBytes: 250_000, timeoutMs: 4_000, freshMs: 300_000 } as const;
export type Observation = { status: "machine_verified" | "pending" | "rejected"; reason: string; checked_at: string; evidence_id: string; business_name: string; building_service: string; relevance: string; pages: { url: string; page_sha256: string; snippet: string; refusal: boolean }[]; policy: typeof POLICY; legal_consent_established: false };
type Target = { id: string; destination_type: string; destination_normalized: string; source_type: string; source_url: string; source_publisher?: string; business_relevance_explanation?: string; contractor_lead_id?: string; contractor_prospect_id?: string; reviewer_id?: string };
type Company = { business_name: string; website_url?: string; official_domain?: string; category_primary?: string; specialty?: string; category?: string; trade?: string; trade_category?: string; category_slug?: string };
type IO = { fetch: typeof fetch; resolve: (host: string) => Promise<string[]>; now?: () => number };

/**
 * A before/after DNS resolve does NOT control which IP fetch() actually
 * dials (DNS rebinding / TOCTOU). Only a transport that pins the socket to
 * the validated address is accepted; anything else fails closed.
 */
const TOLL_FREE = /^\+1(?:800|833|844|855|866|877|888)/;
export const PINNED_TRANSPORT = Symbol.for("unpro.pinned-public-transport");

export function publicAddress(ip: string): boolean {
  // Fail closed on IPv6 (including mapped IPv4) until a pinned IPv6 transport is available.
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return false;
  const p = ip.split(".").map(Number);
  if (p.some(x => x > 255)) return false;
  return !(p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && (p[1] === 168 || p[1] === 0 || p[1] === 2)) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127) || (p[0] === 198 && [18,19,51].includes(p[1])) || (p[0] === 203 && p[1] === 0));
}
export function safeUrl(raw: string, expectedHost?: string): URL {
  const u = new URL(raw);
  const r = resolveOfficialDomain(raw);
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443") || !r.canonical || r.is_blocked || /^[\d.]+$/.test(u.hostname) || u.hostname.includes(":") || u.hostname.endsWith(".local") || u.hostname.endsWith(".internal") || (expectedHost && u.hostname !== expectedHost)) throw new Error("unsafe_source");
  u.hash = "";
  return u;
}
function text(html: string) {
  return html.replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*(?:hidden|display\s*:\s*none)[^>]*>[\s\S]*?<\/[^>]+>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const refusal = (s: string) => /(?:no|not|unsolicited|do not).{0,60}(?:solicitation|marketing|commercial|spam)|(?:pas|aucun|refus|interdit|ne.{0,12}pas).{0,70}(?:sollicit|publicit|commercial|prospect)|(?:sollicit|publicit).{0,50}(?:interdit|refus)/i.test(norm(s));
async function read(raw: string, io: IO, host: string, plain = false): Promise<string> {
  if ((io.fetch as unknown as Record<symbol, unknown>)[PINNED_TRANSPORT] !== true) throw new Error("unpinned_transport");
  const u = safeUrl(raw, host);
  const before = (await io.resolve(u.hostname)).sort();
  if (!before.length || before.some(ip => !publicAddress(ip))) throw new Error("unsafe_dns");
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), POLICY.timeoutMs);
  try {
    const r = await io.fetch(u.toString(), { redirect: "manual", signal: ctrl.signal, headers: { "User-Agent": UNPRO_USER_AGENT, "Cache-Control": "no-cache" } });
    if (!r.ok || r.status >= 300 || r.headers.get("location")) { await r.body?.cancel(); throw new Error("unreachable_or_redirect"); }
    if (Number(r.headers.get("age") ?? "0") > 300 || /\bstale\b/i.test(r.headers.get("warning") ?? "")) { await r.body?.cancel(); throw new Error("stale_content"); }
    if (!(r.headers.get("content-type") ?? "").includes(plain ? "text/" : "text/html")) { await r.body?.cancel(); throw new Error("unsupported_content"); }
    const reader = r.body?.getReader(); if (!reader) throw new Error("empty_page");
    let bytes = 0; let out = ""; const decoder = new TextDecoder();
    try { while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.length; if (bytes > POLICY.maxBytes) throw new Error("volume_limit"); out += decoder.decode(chunk.value, { stream: true }); } out += decoder.decode(); } finally { await reader.cancel(); }
    const after = (await io.resolve(u.hostname)).sort();
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("dns_changed");
    return out;
  } finally { clearTimeout(timer); }
}

/** Only objectively present trade terms are eligible for automated corroboration. */
function serviceHint(company: Company): string {
  const declared = company.category_primary || company.specialty || company.category || company.trade || company.trade_category || company.category_slug;
  if (declared) return declared;
  const name = norm(company.business_name ?? "");
  if (/\b(painting|peinture|painter|peintre)\b/.test(name)) return "painting";
  if (/\b(excavation|excavations)\b/.test(name)) return "excavation";
  if (/\b(roofing|toiture|couvreur)\b/.test(name)) return "roofing";
  if (/\b(isolation|insulation)\b/.test(name)) return "insulation";
  return "";
}
function serviceVisible(visible: string, service: string): boolean {
  const normalized = norm(visible);
  const declared = norm(service);
  const aliases: Record<string, RegExp> = {
    "nettoyage-conduits": /conduits|ducts|dryer|secheuse/,
    "lavage-de-vitres": /vitres|windows|fenetres/,
    "entretien-menager": /menag|cleaning|nettoyage/,
    "grand-menage": /menag|cleaning|nettoyage/,
    "debarras-ramassage": /debarras|junk|encombrants/,
    "entretien-gazon": /gazon|pelouse|lawn/,
    "gestion-parasitaire": /parasit|extermin|pest/,
    "nettoyage-tapis": /tapis|carpet|rug/,
    "nettoyage-mobilier": /mobilier|upholstery|tissus/,
    "nettoyage-gouttieres": /gouttiere|gutter/,
    "lavage-pression": /pression|pressure/,
    peinture: /\b(peinture|peintre|painting|painters?)\b/,
    painting: /\b(peinture|peintre|painting|painters?)\b/,
    toiture: /\b(toiture|couvreur|roofing|roofers?)\b/,
    roofing: /\b(toiture|couvreur|roofing|roofers?)\b/,
    isolation: /\b(isolation|insulation)\b/,
    insulation: /\b(isolation|insulation)\b/,
  };
  return (aliases[declared]?.test(normalized)) ?? normalized.includes(declared);
}

export async function observeFirstParty(e: Target, company: Company, io: IO): Promise<Observation> {
  const result: Observation = { status: "pending", reason: "not_checked", evidence_id: e.id, business_name: company.business_name ?? "", building_service: serviceHint(company), relevance: "", checked_at: new Date(io.now?.() ?? Date.now()).toISOString(), pages: [], policy: POLICY, legal_consent_established: false };
  try {
    if (!["email", "phone_sms"].includes(e.destination_type) || e.source_type !== "company_website") throw new Error("first_party_destination_required");
    const isPhone = e.destination_type === "phone_sms";
    const phone = isPhone ? normalizePhone(e.destination_normalized) : null;
    if (isPhone && (!phone?.valid || !phone.normalized || !/^\+1[2-9]\d{2}[2-9]\d{6}$/.test(phone.normalized) || TOLL_FREE.test(phone.normalized))) throw new Error("invalid_sms_destination");
    const source = safeUrl(e.source_url);
    const rawOfficial = company.official_domain ?? company.website_url ?? "";
    const official = safeUrl(/^https:\/\//i.test(rawOfficial) ? rawOfficial : `https://${rawOfficial}`);
    const email = normalizeCaslDestination("email", e.destination_normalized);
    if ((!isPhone && (!email || !/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(email))) || source.hostname.replace(/^www\./, "") !== official.hostname.replace(/^www\./, "") || (!isPhone && email?.split("@")[1] !== source.hostname.replace(/^www\./, ""))) throw new Error("official_identity_ambiguous");
    if (!company.business_name || !result.building_service || !e.business_relevance_explanation) throw new Error("professional_relevance_missing");
    const rules = parseRobots(await read(`${source.origin}/robots.txt`, io, source.hostname, true));
    const queue = [source.toString()]; const seen = new Set<string>(); let exact = false; let name = false; let service = false; let contact = false; let policy = false;
    for (let i = 0; i < queue.length; i++) {
      if (seen.size >= POLICY.maxPages) throw new Error("page_budget_exceeded");
      const u = safeUrl(queue[i], source.hostname); if (seen.has(u.toString())) continue; seen.add(u.toString());
      if (!isAllowedByRobots(rules, u.pathname)) throw new Error("robots_blocked");
      const html = await read(u.toString(), io, source.hostname); const visible = text(html); const lower = norm(visible);
      const addresses = visible.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) ?? []; const phoneMatches = visible.match(/(?:\+?1[ .-]?)?\(?[2-9]\d{2}\)?[ .-]?[2-9]\d{2}[ .-]?\d{4}/g) ?? [];
      const matchedPhone = phoneMatches.find(raw => normalizePhone(raw).normalized === phone?.normalized);
      const found = isPhone ? Boolean(matchedPhone) : addresses.some(a => a.toLowerCase() === email);
      exact ||= isPhone ? (i === 0 && found) : found; name ||= lower.includes(norm(company.business_name)); service ||= serviceVisible(visible, result.building_service);
      const refused = refusal(visible); const at = found ? Math.max(0, visible.toLowerCase().indexOf(isPhone ? matchedPhone ?? "" : email ?? "")) : 0;
      result.pages.push({ url: u.toString(), page_sha256: await sha256Hex(html), snippet: visible.slice(Math.max(0, at - 180), at + 350), refusal: refused });
      if (refused) { result.status = "rejected"; result.reason = "solicitation_refused"; return result; }
      for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
        const label = norm(`${m[1]} ${text(m[2])}`); const isContact = /contact|joindre/.test(label); const isPolicy = /privacy|politique|confidential|terms|conditions/.test(label);
        if (!isContact && !isPolicy) continue;
        const next = safeUrl(new URL(m[1], u).toString(), source.hostname);
        contact ||= isContact; policy ||= isPolicy;
        if (!queue.includes(next.toString())) queue.push(next.toString());
      }
    }
    result.relevance = e.business_relevance_explanation;
    result.reason = !exact ? (isPhone ? "exact_phone_not_visible" : "exact_email_not_visible") : !name || !service ? "company_or_service_ambiguous" : !contact || !policy ? "contact_or_policy_missing" : "publication_observed_human_review_required";
    if (exact && name && service && contact && policy) result.status = "machine_verified";
  } catch (err) { result.reason = err instanceof Error ? err.message : "check_failed"; }
  return result;
}

// No consent row, reviewer, prospect, gate or provider is ever mutated here.
export async function recheckCasl(sb: any, id: string, io: IO, dryRun: boolean) {
  const { data: e, error } = await sb.from("casl_consent_evidence").select("*").eq("id", id).maybeSingle();
  if (error || !e) throw new Error("evidence_lookup_failed");
  const { data: lead, error: le } = e.contractor_lead_id ? await sb.from("contractor_leads").select("business_name,website_url,official_domain,category_primary").eq("id", e.contractor_lead_id).maybeSingle() : { data: null, error: null };
  if (le) throw new Error("company_lookup_failed");
  const { data: prospect, error: pe } = e.contractor_prospect_id
    ? await sb.from("contractor_prospects").select("business_name,website_url,trade,trade_category,category_slug").eq("id", e.contractor_prospect_id).maybeSingle()
    : { data: null, error: null };
  if (pe) throw new Error("company_lookup_failed");
  const company = lead ?? prospect ?? { business_name: e.source_publisher ?? "", website_url: "", category: "" };
  const observation = await observeFirstParty(e, company, io);
  if (!dryRun) {
    const { error: writeError } = await sb.from("official_site_crawl_runs").insert({ contractor_lead_id: e.contractor_lead_id ?? null, prospect_id: e.contractor_prospect_id ?? null, canonical_domain: e.source_url ? new URL(e.source_url).origin : "", status: observation.status === "machine_verified" ? "complete_with_contact" : "blocked", reason: observation.reason, pages_attempted: observation.pages.length, pages_ok: observation.pages.length, finished_at: observation.checked_at, summary: { casl_machine: observation } });
    if (writeError) throw new Error("observation_write_failed");
  }
  return observation;
}
/** Modest maintenance services only; regulated construction is never inferred eligible. */
export const PHONE_CAPTURE_SERVICES = new Set(["nettoyage-conduits", "lavage-de-vitres", "entretien-menager", "grand-menage", "debarras-ramassage", "entretien-gazon", "gestion-parasitaire", "nettoyage-tapis", "nettoyage-mobilier", "nettoyage-gouttieres", "lavage-pression"]);
const NOT_SERVICE_PROVIDER = /hotel|hôtel|aquatique|aqua club|piscine municipale|parc du|entraide|écocentre|ecocentre|ameublement|ville de|municipalit|gouvernement|fondation|organisme/i;

/** Maps the real declared trade text (category_slug is mostly NULL) through the canonical local-service mapping. */
export function phoneCaptureService(p: { category_slug?: string | null; trade?: string | null; trade_category?: string | null }): string | null {
  for (const raw of [p.category_slug, p.trade, p.trade_category]) {
    const slug = normalizeServiceCategory(raw ?? null);
    if (slug) return PHONE_CAPTURE_SERVICES.has(slug) ? slug : null;
  }
  return null;
}

/**
 * Explicit admin action on an exact existing contractor_prospects anchor.
 * Never sets reviewer_id, never approves consent, never changes prospect, gate or provider state.
 */
export async function captureFirstPartyPhone(sb: any, id: string, io: IO, dryRun: boolean) {
  const { data: p, error } = await sb.from("contractor_prospects")
    .select("id,business_name,website_url,phone,phone_e164,category_slug,trade,trade_category,do_not_contact,outreach_status,suppression_reason")
    .eq("id", id).maybeSingle();
  if (error || !p) throw new Error("canonical_anchor_missing_or_unreadable");
  if (p.do_not_contact || p.suppression_reason) throw new Error("opted_out_or_suppressed");
  if (p.outreach_status && !["none", "new", "pending", "not_contacted", "not_started"].includes(p.outreach_status)) throw new Error("already_contacted");
  const service = phoneCaptureService(p);
  if (!service) throw new Error("service_fit_requires_review");
  if (NOT_SERVICE_PROVIDER.test(p.business_name ?? "")) throw new Error("not_service_provider");
  const phone = normalizePhone(p.phone_e164 ?? p.phone);
  if (!phone.valid || !phone.normalized || TOLL_FREE.test(phone.normalized)) throw new Error("invalid_sms_destination");
  const { data: duplicates, error: duplicateError } = await sb.from("contractor_prospects").select("id").eq("phone_e164", phone.normalized).limit(2);
  if (duplicateError || !duplicates || duplicates.length !== 1 || duplicates[0].id !== id) throw new Error("canonical_phone_ambiguous");
  const { data: opted, error: optError } = await sb.from("sms_opt_outs").select("normalized_phone").in("normalized_phone", [phone.normalized, phone.normalized.slice(2)]).limit(1);
  if (optError || !opted || opted.length) throw new Error("opted_out_or_unreadable");
  // Public listing is not permission to contact a suppressed destination.
  // Fail closed if the canonical suppression RPC cannot be read.
  const { data: suppressed, error: suppressionError } = await sb.rpc("is_phone_suppressed", { p_phone: phone.normalized });
  if (suppressionError || suppressed !== false) throw new Error("suppression_blocked_or_unreadable");
  if (!p.website_url) throw new Error("official_site_missing");
  const source = safeUrl(/^https:\/\//i.test(p.website_url) ? p.website_url : `https://${p.website_url}`).toString();
  const relevance = `Publication à examiner pour le service déclaré « ${service} »; aucune autorisation de sollicitation automatique.`;
  const observation = await observeFirstParty({ id, destination_type: "phone_sms", destination_normalized: phone.normalized, source_type: "company_website", source_url: source, business_relevance_explanation: relevance }, { business_name: p.business_name, website_url: source, category_slug: service }, io);
  let evidenceId: string | null = null;
  if (observation.status === "machine_verified" && !dryRun) {
    // Fail-closed dedupe before the capture helper (which tolerates read errors).
    const { data: existing, error: evidenceError } = await sb.from("casl_consent_evidence").select("id").eq("contractor_prospect_id", id).eq("destination_type", "phone_sms").eq("destination_normalized", phone.normalized.slice(2)).eq("source_url", source).limit(1);
    if (evidenceError || !existing) throw new Error("evidence_dedupe_unreadable");
    if (existing.length) evidenceId = existing[0].id;
    else {
      const page = observation.pages[0];
      if (!page) throw new Error("source_observation_missing");
      const captured = await captureCaslEvidence(sb, { contractor_prospect_id: id, destination_type: "phone_sms", destination: phone.normalized, lawful_basis: "implicit_public_conspicuous", source_url: source, source_type: "company_website", source_publisher: p.business_name, retrieved_at: observation.checked_at, page_sha256: page.page_sha256, business_relevance_explanation: `${relevance} Extrait observé : ${page.snippet}`, refusal_statement_found: false, verification_method: "first_party_phone_pending_human_review", capture_agent: "enrich-official-website" });
      if (!captured.ok || !captured.evidence_id) throw new Error("phone_evidence_capture_failed");
      evidenceId = captured.evidence_id;
    }
  }
  return { observation, service, evidence_id: evidenceId, human_review_required: true, legal_consent_established: false, dry_run: dryRun, sent: 0 };
}
