/**
 * UNPRO — Enrichment Preview Classifier (READ-ONLY).
 *
 * Pure functions. Assigns each lead exactly ONE of 8 mutually exclusive
 * buckets so the admin preview at /admin/official-site-enrichment can
 * answer "who would be crawled, who would not, and why" without mutating
 * anything.
 *
 * Precedence (first match wins):
 *   1. SUSPECTED_TEST_DATA
 *   2. SUSPECTED_DUPLICATE
 *   3. PHONE_REGION_MISMATCH   (QC destination but non-QC/foreign area code)
 *   4. INVALID_CONTACT         (validation says invalid AND nothing usable)
 *   5. ALREADY_COMPLETE        (crawl terminal-complete OR both contacts present)
 *   6. NO_OFFICIAL_DOMAIN
 *   7. READY_TO_ENRICH
 *   8. MANUAL_REVIEW_REQUIRED  (fallback — guarantees exhaustive coverage)
 */
import {
  hasUsableOfficialDomain,
  classifyOfficialSiteState,
  type OfficialSiteState,
} from "../../supabase/functions/_shared/officialSiteGate";

export type EnrichmentClassification =
  | "READY_TO_ENRICH"
  | "ALREADY_COMPLETE"
  | "NO_OFFICIAL_DOMAIN"
  | "SUSPECTED_TEST_DATA"
  | "SUSPECTED_DUPLICATE"
  | "PHONE_REGION_MISMATCH"
  | "INVALID_CONTACT"
  | "MANUAL_REVIEW_REQUIRED";

export const CLASSIFICATION_LABEL: Record<EnrichmentClassification, string> = {
  READY_TO_ENRICH: "Prêt à enrichir",
  ALREADY_COMPLETE: "Déjà complet",
  NO_OFFICIAL_DOMAIN: "Pas de site officiel",
  SUSPECTED_TEST_DATA: "Données de test suspectées",
  SUSPECTED_DUPLICATE: "Doublon suspecté",
  PHONE_REGION_MISMATCH: "Zone téléphonique incohérente",
  INVALID_CONTACT: "Contact invalide",
  MANUAL_REVIEW_REQUIRED: "Revue manuelle requise",
};

// Quebec NANP area codes (mobile + landline).
const QC_AREA_CODES = new Set(["418", "438", "450", "514", "579", "581", "819", "873"]);

const QC_CITY_HINTS = /(montr[eé]al|laval|longueuil|brossard|terrebonne|repentigny|qu[eé]bec|gatineau|sherbrooke|trois[- ]rivi[eè]res|saguenay|l[eé]vis|saint|sainte|st[- ]|ste[- ])/i;

const TEST_PATTERNS = [
  /\btest\b/i,
  /\bdemo\b/i,
  /\bexemple\b/i,
  /\bsample\b/i,
  /\bfake\b/i,
  /\bxxx+\b/i,
  /555[-\s]?0?1(23|00)/,       // 555-0123 / 555-1234 style
  /\+?1?0{9,}/,                // +10000000000 etc.
];

const TEST_EMAIL_PATTERNS = [
  /@example\.(com|org|net)$/i,
  /@test\./i,
  /^test@/i,
  /^noreply@/i,
  /^courriel@courriel\./i,
];

const TEST_DOMAIN_PATTERNS = [
  /test[-.]/i,
  /demo[-.]/i,
  /simulation/i,
  /\.example\./i,
];

export interface LeadForClassification {
  id: string;
  company_name: string | null;
  city: string | null;
  category: string | null;
  phone: string | null;
  phone_e164: string | null;
  phone_area_code: string | null;
  phone_validation_status: string | null;
  email: string | null;
  website_url: string | null;
  official_domain: string | null;
  official_site_status: string | null;
}

export interface ClassifiedLead extends LeadForClassification {
  classification: EnrichmentClassification;
  reason: string;
  state: OfficialSiteState;
  duplicate_key: string | null;         // phone_e164 or lowercase(name) causing the dup
  warnings: string[];                   // human-readable flags for display
  proposed_phone_after: string | null;  // for now, mirrors existing (no crawl run here)
  proposed_email_after: string | null;
  proposed_source_url: string | null;   // official_domain / website_url used as source
  confidence: "high" | "medium" | "low";
}

function looksLikeTestData(l: LeadForClassification): string | null {
  const name = l.company_name ?? "";
  const email = l.email ?? "";
  const phone = `${l.phone ?? ""} ${l.phone_e164 ?? ""}`;
  const domain = l.website_url ?? l.official_domain ?? "";
  if (TEST_PATTERNS.some(rx => rx.test(name))) return `nom société "${name}" match motif test`;
  if (TEST_EMAIL_PATTERNS.some(rx => rx.test(email))) return `courriel "${email}" match motif test`;
  if (TEST_PATTERNS.some(rx => rx.test(phone))) return `téléphone "${phone.trim()}" match motif test`;
  if (TEST_DOMAIN_PATTERNS.some(rx => rx.test(domain))) return `domaine "${domain}" match motif test`;
  if (l.phone_area_code === "000") return `indicatif régional "000"`;
  return null;
}

function normName(n: string | null): string | null {
  if (!n) return null;
  const s = n.trim().toLowerCase().replace(/[\s.,-]+/g, " ").replace(/\s+inc\.?$|\s+ltée\.?$|\s+ltd\.?$/i, "").trim();
  return s || null;
}

/**
 * Classify a batch. Duplicate detection needs global context, so pass the
 * entire set. Order in output matches order in input.
 */
export function classifyLeadBatch(leads: LeadForClassification[]): ClassifiedLead[] {
  // Build duplicate indices.
  const phoneCounts = new Map<string, number>();
  const nameCounts = new Map<string, number>();
  for (const l of leads) {
    if (l.phone_e164) phoneCounts.set(l.phone_e164, (phoneCounts.get(l.phone_e164) ?? 0) + 1);
    const n = normName(l.company_name);
    if (n) nameCounts.set(n, (nameCounts.get(n) ?? 0) + 1);
  }

  return leads.map(l => {
    const warnings: string[] = [];

    // Precompute a few things.
    const state = classifyOfficialSiteState({
      phone: l.phone ?? l.phone_e164 ?? null,
      email: l.email ?? null,
      website_url: l.website_url ?? null,
      official_domain: l.official_domain ?? null,
      official_site_status: l.official_site_status ?? null,
    });
    const hasDomain = hasUsableOfficialDomain(l.official_domain ?? l.website_url ?? null);
    const nName = normName(l.company_name);
    const dupPhone = l.phone_e164 && (phoneCounts.get(l.phone_e164) ?? 0) > 1;
    const dupName  = nName && (nameCounts.get(nName) ?? 0) > 1;

    // Collect warnings independently of the classification bucket.
    if (dupPhone) warnings.push(`téléphone partagé × ${phoneCounts.get(l.phone_e164!)}`);
    if (dupName)  warnings.push(`nom société répété × ${nameCounts.get(nName!)}`);
    if (l.phone_area_code && !QC_AREA_CODES.has(l.phone_area_code)
        && (l.city ?? "").match(QC_CITY_HINTS)) {
      warnings.push(`indicatif ${l.phone_area_code} hors QC pour ville "${l.city}"`);
    }
    if (l.phone_validation_status === "invalid_phone" || l.phone_validation_status === "lookup_failed") {
      warnings.push(`validation tél: ${l.phone_validation_status}`);
    }

    // --- Precedence-ordered classification ---
    let classification: EnrichmentClassification;
    let reason = "";

    const testReason = looksLikeTestData(l);
    if (testReason) {
      classification = "SUSPECTED_TEST_DATA";
      reason = testReason;
    } else if (dupPhone || dupName) {
      classification = "SUSPECTED_DUPLICATE";
      reason = dupPhone
        ? `téléphone ${l.phone_e164} présent ${phoneCounts.get(l.phone_e164!)} fois`
        : `nom société "${l.company_name}" présent ${nameCounts.get(nName!)} fois`;
    } else if (
      l.phone_area_code &&
      !QC_AREA_CODES.has(l.phone_area_code) &&
      (l.city ?? "").match(QC_CITY_HINTS)
    ) {
      classification = "PHONE_REGION_MISMATCH";
      reason = `indicatif ${l.phone_area_code} incompatible avec ville QC "${l.city}"`;
    } else if (
      (l.phone_validation_status === "invalid_phone" || l.phone_validation_status === "lookup_failed") &&
      !l.email && !hasDomain
    ) {
      classification = "INVALID_CONTACT";
      reason = `${l.phone_validation_status} et aucun autre canal (email/site) exploitable`;
    } else if (state === "complete_with_contact" || (l.phone_e164 && l.email && l.phone_validation_status !== "invalid_phone")) {
      classification = "ALREADY_COMPLETE";
      reason = state === "complete_with_contact" ? "crawl terminal: complete_with_contact" : "téléphone + courriel déjà présents";
    } else if (!hasDomain) {
      classification = "NO_OFFICIAL_DOMAIN";
      reason = l.website_url ? `URL "${l.website_url}" n'est pas un site officiel exploitable` : "aucun website_url ni official_domain";
    } else if (
      state === "official_site_enrichment_required" ||
      state === "official_site_enrichment_queued" ||
      state === "official_site_enrichment_running" ||
      state === "official_site_enrichment_retryable" ||
      state === "complete_no_contact"
    ) {
      classification = "READY_TO_ENRICH";
      reason = `domaine "${l.official_domain ?? l.website_url}" présent, état crawler = ${state}, ${!l.phone_e164 ? "tél. manquant" : ""}${!l.phone_e164 && !l.email ? " + " : ""}${!l.email ? "courriel manquant" : ""}`.trim();
    } else {
      classification = "MANUAL_REVIEW_REQUIRED";
      reason = `combinaison non couverte (état=${state}, phone_valid=${l.phone_validation_status})`;
    }

    // Confidence heuristic.
    let confidence: "high" | "medium" | "low" = "medium";
    if (classification === "SUSPECTED_TEST_DATA" || classification === "ALREADY_COMPLETE" || classification === "NO_OFFICIAL_DOMAIN") confidence = "high";
    if (classification === "MANUAL_REVIEW_REQUIRED" || classification === "SUSPECTED_DUPLICATE") confidence = "low";

    return {
      ...l,
      classification,
      reason,
      state,
      duplicate_key: dupPhone ? l.phone_e164 : dupName ? nName : null,
      warnings,
      // No crawl performed in the preview → "after" == "before" for now.
      proposed_phone_after: l.phone_e164 ?? l.phone ?? null,
      proposed_email_after: l.email ?? null,
      proposed_source_url: l.official_domain ?? l.website_url ?? null,
      confidence,
    };
  });
}

export function countByClassification(rows: ClassifiedLead[]): Record<EnrichmentClassification, number> {
  const acc: Record<EnrichmentClassification, number> = {
    READY_TO_ENRICH: 0, ALREADY_COMPLETE: 0, NO_OFFICIAL_DOMAIN: 0,
    SUSPECTED_TEST_DATA: 0, SUSPECTED_DUPLICATE: 0, PHONE_REGION_MISMATCH: 0,
    INVALID_CONTACT: 0, MANUAL_REVIEW_REQUIRED: 0,
  };
  for (const r of rows) acc[r.classification]++;
  return acc;
}
