/**
 * UNPRO Contractor Verification Engine — v2
 * ==========================================
 * Production-ready orchestration for contractor identity resolution,
 * scoring, evidence processing, and admin alerting.
 *
 * POST /verify-contractor
 * Body: {
 *   input?: string,           // phone, name, rbq, neq, or website
 *   project_description?: string,
 *   image_base64?: string,    // optional uploaded evidence
 *   image_type?: string,      // "business_card"|"truck"|"contract"|"invoice"|"quote"
 *   verification_run_id?: string, // if resuming an existing run
 *   source_page?: string,
 *   device_type?: string,
 *   referrer?: string,
 * }
 *
 * Returns: VerificationOutputContract (see bottom of file)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ══════════════════════════════════════════════════════════════
// CORS
// ══════════════════════════════════════════════════════════════
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════
type SearchType = "phone" | "name" | "rbq" | "neq" | "website" | "upload";

type IdentityResolutionStatus =
  | "verified_internal_profile"
  | "verified_match"
  | "probable_match_needs_more_proof"
  | "ambiguous_match"
  | "no_reliable_match";

interface MatchedEntity {
  id?: string;
  business_name: string | null;
  legal_name: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  address: string | null;
  rbq_number: string | null;
  neq: string | null;
}

interface InternalProfile {
  found: boolean;
  admin_verified: boolean;
  used_admin_verified_profile: boolean;
  internal_verified_score: number | null;
  internal_verified_at: string | null;
  verification_status: string;
}

interface VerificationDetail {
  rbq_status: string;
  neq_status: string;
  web_presence: string;
  reviews_summary: string;
  review_authenticity_signal: string;
  visual_consistency: string;
}

interface Scores {
  identity_confidence_score: number;
  public_trust_score: number;
  internal_verified_score: number | null;
  live_risk_delta: number | null;
}

interface VerificationOutput {
  identity_resolution: {
    status: IdentityResolutionStatus;
    identity_confidence_score: number;
    summary: string;
    matched_entity: MatchedEntity;
  };
  internal_profile: InternalProfile;
  verification: VerificationDetail;
  scores: Scores;
  strengths: string[];
  risks: string[];
  inconsistencies: string[];
  missing_proofs: string[];
  recommended_next_inputs: string[];
  admin: {
    admin_alert_created: boolean;
    admin_review_status: string;
  };
  final_recommendation: string;
}

interface ContractorRow {
  id: string;
  business_name: string | null;
  legal_name: string | null;
  phone: string | null;
  normalized_phone: string | null;
  website: string | null;
  normalized_website: string | null;
  normalized_business_name: string | null;
  city: string | null;
  address: string | null;
  rbq_number: string | null;
  license_number: string | null;
  neq: string | null;
  email: string | null;
  admin_verified: boolean | null;
  internal_verified_score: number | null;
  internal_verified_at: string | null;
  verification_status: string | null;
  verification_notes: string | null;
  rating: number | null;
  review_count: number | null;
  years_experience: number | null;
  slug: string | null;
  specialty: string | null;
  description: string | null;
}

interface EvidenceRow {
  id: string;
  file_type: string | null;
  extracted_text: string | null;
  extracted_phone: string | null;
  extracted_business_name: string | null;
  extracted_website: string | null;
  extracted_rbq: string | null;
  extracted_neq: string | null;
  extracted_address: string | null;
  extracted_city: string | null;
  visual_consistency_score: number | null;
  analysis_summary: string | null;
}

// ══════════════════════════════════════════════════════════════
// 1. NORMALIZATION HELPERS
// ══════════════════════════════════════════════════════════════

/** Strip formatting from phone, remove country code 1 */
function normalizePhone(raw: string): string {
  if (!raw) return "";
  return raw.replace(/[\s\-\(\)\.+]/g, "").replace(/^1(?=\d{10}$)/, "");
}

/** Remove legal suffixes and extra whitespace from business name */
function normalizeBusinessName(raw: string): string {
  if (!raw) return "";
  return raw
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/\b(inc|ltée|ltd|enr|senc|s\.e\.n\.c|llc|corp|cie|compagnie|limitée|limited)\b\.?/gi, "")
    .replace(/[,.']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract domain from full URL */
function normalizeWebsite(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .toLowerCase()
    .trim();
}

/** Normalize city name for comparison */
function normalizeCity(raw: string): string {
  if (!raw) return "";
  return raw
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bsaint-/g, "st-")
    .replace(/\bsainte-/g, "ste-")
    .replace(/\bmontreal\b/g, "montreal")
    .trim();
}

/** Strip formatting from RBQ number */
function normalizeRbq(raw: string): string {
  if (!raw) return "";
  return raw.replace(/[\s\-\.]/g, "");
}

/** Strip formatting from NEQ */
function normalizeNeq(raw: string): string {
  if (!raw) return "";
  return raw.replace(/[\s\-\.]/g, "");
}

/** Safe fuzzy comparison — returns 0-1 similarity */
function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  // Simple Jaccard on words
  const wordsA = new Set(na.split(/\s+/));
  const wordsB = new Set(nb.split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

/** Detect what type of identifier the user provided */
function detectInputType(raw: string): SearchType {
  const cleaned = raw.trim();
  const digitsOnly = cleaned.replace(/[\s\-]/g, "");
  // RBQ: typically XXXX-XXXX-XX format
  if (/^\d{4}[\s\-]?\d{4}[\s\-]?\d{2}$/.test(cleaned)) return "rbq";
  // Phone: 10 digits
  const phoneDigits = normalizePhone(cleaned);
  if (/^\d{10}$/.test(phoneDigits)) return "phone";
  // NEQ: 10 digits without dashes
  if (/^\d{10}$/.test(digitsOnly)) return "neq";
  // Website
  if (/^https?:\/\//i.test(cleaned) || /\.\w{2,}$/.test(cleaned)) return "website";
  return "name";
}

// ══════════════════════════════════════════════════════════════
// 2. INTERNAL IDENTITY LOOKUP
// ══════════════════════════════════════════════════════════════

/**
 * Searches for matching contractors in priority order.
 * Returns all candidates with a match_method tag.
 */
async function findInternalMatches(
  supabase: SupabaseClient,
  inputType: SearchType,
  normalizedInput: string,
  rawInput: string,
  inputCity?: string
): Promise<{ contractor: ContractorRow; match_method: string; match_strength: number }[]> {
  const results: { contractor: ContractorRow; match_method: string; match_strength: number }[] = [];
  const selectFields = `id, business_name, legal_name, phone, normalized_phone, website, normalized_website,
    normalized_business_name, city, address, rbq_number, license_number, neq, email,
    admin_verified, internal_verified_score, internal_verified_at, verification_status,
    verification_notes, rating, review_count, years_experience, slug, specialty, description`;

  // Priority 1: RBQ exact match
  if (inputType === "rbq" || normalizedInput) {
    const rbqVal = inputType === "rbq" ? normalizedInput : null;
    if (rbqVal) {
      const { data } = await supabase.from("contractors").select(selectFields)
        .or(`rbq_number.eq.${rbqVal},license_number.eq.${rbqVal}`).limit(3);
      if (data?.length) {
        data.forEach((c: ContractorRow) => results.push({ contractor: c, match_method: "rbq_exact", match_strength: 1.0 }));
      }
    }
  }

  // Priority 2: NEQ exact match
  if (inputType === "neq") {
    const { data } = await supabase.from("contractors").select(selectFields)
      .eq("neq", normalizedInput).limit(3);
    if (data?.length) {
      data.forEach((c: ContractorRow) => {
        if (!results.find(r => r.contractor.id === c.id))
          results.push({ contractor: c, match_method: "neq_exact", match_strength: 1.0 });
      });
    }
  }

  // Priority 3: Normalized phone
  if (inputType === "phone") {
    const { data } = await supabase.from("contractors").select(selectFields)
      .eq("normalized_phone", normalizedInput).limit(5);
    if (data?.length) {
      data.forEach((c: ContractorRow) => {
        if (!results.find(r => r.contractor.id === c.id))
          results.push({ contractor: c, match_method: "phone_normalized", match_strength: 0.95 });
      });
    }
    // Fallback: partial phone match on raw phone field
    if (!data?.length) {
      const last7 = normalizedInput.slice(-7);
      const { data: fuzzy } = await supabase.from("contractors").select(selectFields)
        .ilike("phone", `%${last7}%`).limit(5);
      if (fuzzy?.length) {
        fuzzy.forEach((c: ContractorRow) => {
          if (!results.find(r => r.contractor.id === c.id))
            results.push({ contractor: c, match_method: "phone_partial", match_strength: 0.7 });
        });
      }
    }
  }

  // Priority 4: Normalized website
  if (inputType === "website") {
    const { data } = await supabase.from("contractors").select(selectFields)
      .eq("normalized_website", normalizedInput).limit(3);
    if (data?.length) {
      data.forEach((c: ContractorRow) => {
        if (!results.find(r => r.contractor.id === c.id))
          results.push({ contractor: c, match_method: "website_normalized", match_strength: 0.9 });
      });
    }
  }

  // Priority 5: Normalized business name + city
  if (inputType === "name") {
    const normName = normalizeBusinessName(rawInput);
    const normCity = inputCity ? normalizeCity(inputCity) : null;

    // Try exact normalized name match first
    const { data } = await supabase.from("contractors").select(selectFields)
      .eq("normalized_business_name", normName).limit(5);
    if (data?.length) {
      data.forEach((c: ContractorRow) => {
        const cityMatch = normCity && c.city ? normalizeCity(c.city) === normCity : true;
        if (!results.find(r => r.contractor.id === c.id))
          results.push({
            contractor: c,
            match_method: cityMatch ? "name_city_exact" : "name_exact",
            match_strength: cityMatch ? 0.9 : 0.75,
          });
      });
    }

    // Fallback: ilike on business_name
    if (!data?.length) {
      const { data: fuzzy } = await supabase.from("contractors").select(selectFields)
        .ilike("business_name", `%${normName}%`).limit(5);
      if (fuzzy?.length) {
        fuzzy.forEach((c: ContractorRow) => {
          if (!results.find(r => r.contractor.id === c.id))
            results.push({ contractor: c, match_method: "name_fuzzy", match_strength: 0.5 });
        });
      }
    }
  }

  // Sort: admin_verified first, then by match_strength
  results.sort((a, b) => {
    if (a.contractor.admin_verified && !b.contractor.admin_verified) return -1;
    if (!a.contractor.admin_verified && b.contractor.admin_verified) return 1;
    return b.match_strength - a.match_strength;
  });

  return results;
}

// ══════════════════════════════════════════════════════════════
// 3. SCORING ENGINE
// ══════════════════════════════════════════════════════════════

/**
 * Identity Confidence Score (0-100)
 * Measures how confident we are the input maps to a specific contractor entity.
 */
function computeIdentityConfidence(
  inputType: SearchType,
  normalizedInput: string,
  match: ContractorRow | null,
  evidenceFields: Partial<EvidenceRow>[],
  inputCity?: string
): { score: number; breakdown: Record<string, number> } {
  if (!match) return { score: 0, breakdown: {} };

  const breakdown: Record<string, number> = {};

  // Phone strong match: 20
  if (match.normalized_phone && normalizedInput) {
    const inputPhone = inputType === "phone" ? normalizedInput : "";
    if (inputPhone && match.normalized_phone === inputPhone) {
      breakdown.phone_match = 20;
    } else if (inputPhone && match.normalized_phone.slice(-7) === inputPhone.slice(-7)) {
      breakdown.phone_match = 12;
    }
    // Check evidence phones
    const evidencePhones = evidenceFields.map(e => e.extracted_phone).filter(Boolean).map(p => normalizePhone(p!));
    if (evidencePhones.some(p => p === match.normalized_phone)) {
      breakdown.phone_match = Math.max(breakdown.phone_match || 0, 18);
    }
  }

  // Business name coherence: 20
  if (match.business_name) {
    const inputName = inputType === "name" ? normalizedInput : "";
    if (inputName) {
      const sim = stringSimilarity(normalizeBusinessName(match.business_name), inputName);
      breakdown.business_name_coherence = Math.round(sim * 20);
    }
    // Evidence names
    const evidenceNames = evidenceFields.map(e => e.extracted_business_name).filter(Boolean);
    for (const en of evidenceNames) {
      const sim = stringSimilarity(normalizeBusinessName(match.business_name), normalizeBusinessName(en!));
      breakdown.business_name_coherence = Math.max(breakdown.business_name_coherence || 0, Math.round(sim * 20));
    }
  }

  // Website coherence: 15
  if (match.normalized_website) {
    const inputWeb = inputType === "website" ? normalizedInput : "";
    if (inputWeb && match.normalized_website === inputWeb) {
      breakdown.website_coherence = 15;
    } else if (inputWeb && (match.normalized_website.includes(inputWeb) || inputWeb.includes(match.normalized_website))) {
      breakdown.website_coherence = 10;
    }
    const evidenceWebs = evidenceFields.map(e => e.extracted_website).filter(Boolean).map(w => normalizeWebsite(w!));
    if (evidenceWebs.some(w => w === match.normalized_website)) {
      breakdown.website_coherence = Math.max(breakdown.website_coherence || 0, 13);
    }
  }

  // City/address coherence: 10
  if (match.city && inputCity) {
    const sim = normalizeCity(match.city) === normalizeCity(inputCity) ? 1 : stringSimilarity(match.city, inputCity);
    breakdown.city_coherence = Math.round(sim * 10);
  }
  const evidenceCities = evidenceFields.map(e => e.extracted_city).filter(Boolean);
  if (match.city && evidenceCities.length) {
    for (const ec of evidenceCities) {
      if (normalizeCity(ec!) === normalizeCity(match.city)) {
        breakdown.city_coherence = Math.max(breakdown.city_coherence || 0, 8);
      }
    }
  }

  // RBQ coherence: 15
  const matchRbq = match.rbq_number || match.license_number;
  if (matchRbq) {
    const inputRbq = inputType === "rbq" ? normalizedInput : "";
    if (inputRbq && normalizeRbq(matchRbq) === inputRbq) {
      breakdown.rbq_coherence = 15;
    }
    const evidenceRbqs = evidenceFields.map(e => e.extracted_rbq).filter(Boolean).map(r => normalizeRbq(r!));
    if (evidenceRbqs.some(r => r === normalizeRbq(matchRbq))) {
      breakdown.rbq_coherence = Math.max(breakdown.rbq_coherence || 0, 13);
    }
  }

  // NEQ coherence: 10
  if (match.neq) {
    const inputNeq = inputType === "neq" ? normalizedInput : "";
    if (inputNeq && normalizeNeq(match.neq) === inputNeq) {
      breakdown.neq_coherence = 10;
    }
    const evidenceNeqs = evidenceFields.map(e => e.extracted_neq).filter(Boolean).map(n => normalizeNeq(n!));
    if (evidenceNeqs.some(n => n === normalizeNeq(match.neq))) {
      breakdown.neq_coherence = Math.max(breakdown.neq_coherence || 0, 8);
    }
  }

  // Visual consistency: 5
  const visualScores = evidenceFields.map(e => e.visual_consistency_score).filter(v => v != null) as number[];
  if (visualScores.length) {
    const avg = visualScores.reduce((a, b) => a + b, 0) / visualScores.length;
    breakdown.visual_consistency = Math.round((avg / 100) * 5);
  }

  // No ambiguity bonus: 5 (given if only one strong match)
  // This is set externally based on match count

  const score = Math.min(100, Object.values(breakdown).reduce((a, b) => a + b, 0));
  return { score, breakdown };
}

/**
 * Public Trust Score (0-100)
 * Measures publicly observable trustworthiness signals.
 */
function computePublicTrustScore(
  match: ContractorRow | null,
  evidenceFields: Partial<EvidenceRow>[]
): { score: number; breakdown: Record<string, number> } {
  if (!match) return { score: 0, breakdown: {} };

  const breakdown: Record<string, number> = {};

  // RBQ validity: 20
  const rbq = match.rbq_number || match.license_number;
  if (rbq && rbq.length >= 8) {
    // We have an RBQ on file — assume valid unless we have contrary evidence
    breakdown.rbq_validity = 20;
  } else {
    breakdown.rbq_validity = 0;
  }

  // Detectable age/seniority: 10
  if (match.years_experience) {
    breakdown.seniority = Math.min(10, Math.round(match.years_experience / 3));
  }

  // Review quality: 20
  if (match.rating) {
    // 5.0 = 20, 4.0 = 16, 3.0 = 12, etc.
    breakdown.review_quality = Math.min(20, Math.round(match.rating * 4));
  }

  // Review volume: 10
  if (match.review_count) {
    // 50+ reviews = full score
    breakdown.review_volume = Math.min(10, Math.round(match.review_count / 5));
  }

  // Website quality: 10
  if (match.website || match.normalized_website) {
    breakdown.website_quality = 7; // Basic presence; real quality check deferred
  }

  // Data consistency: 10
  let consistencyScore = 0;
  if (match.business_name) consistencyScore += 2;
  if (match.phone) consistencyScore += 2;
  if (match.email) consistencyScore += 1;
  if (match.city) consistencyScore += 2;
  if (match.address) consistencyScore += 1;
  if (match.description) consistencyScore += 2;
  breakdown.data_consistency = Math.min(10, consistencyScore);

  // Professionalism signals: 10
  let profScore = 0;
  if (match.specialty) profScore += 3;
  if (match.description && match.description.length > 50) profScore += 3;
  if (match.slug) profScore += 2; // Has a public page
  if (match.email && !match.email.includes("gmail") && !match.email.includes("hotmail")) profScore += 2;
  breakdown.professionalism = Math.min(10, profScore);

  // Risk signals: -10 (deductions)
  let riskDeduction = 0;
  if (match.verification_status === "rejected") riskDeduction += 10;
  if (match.verification_status === "suspended") riskDeduction += 8;
  if (!rbq) riskDeduction += 3;
  breakdown.risk_deduction = -Math.min(10, riskDeduction);

  const raw = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { score: Math.max(0, Math.min(100, raw)), breakdown };
}

/**
 * Live Risk Delta: difference between stored internal score and fresh public score.
 * Positive = improvement, Negative = degradation.
 */
function computeLiveRiskDelta(
  internalScore: number | null,
  publicTrustScore: number
): number | null {
  if (internalScore == null) return null;
  return publicTrustScore - internalScore;
}

// ══════════════════════════════════════════════════════════════
// 4. EVIDENCE PIPELINE
// ══════════════════════════════════════════════════════════════

/**
 * Load existing evidence records for a verification run.
 * Uses only pre-extracted fields — never fabricates data.
 */
async function loadEvidence(
  supabase: SupabaseClient,
  runId: string
): Promise<EvidenceRow[]> {
  const { data, error } = await supabase
    .from("contractor_verification_evidence")
    .select("id, file_type, extracted_text, extracted_phone, extracted_business_name, extracted_website, extracted_rbq, extracted_neq, extracted_address, extracted_city, visual_consistency_score, analysis_summary")
    .eq("verification_run_id", runId);

  if (error) {
    console.error("Evidence load error:", error);
    return [];
  }
  return (data || []) as EvidenceRow[];
}

// ══════════════════════════════════════════════════════════════
// 5. ADMIN NOTIFICATIONS
// ══════════════════════════════════════════════════════════════

async function createAdminNotifications(
  supabase: SupabaseClient,
  status: IdentityResolutionStatus,
  contractorId: string | null,
  runId: string,
  liveRiskDelta: number | null,
  hasNewEvidence: boolean,
  matchCount: number
): Promise<boolean> {
  const notifications: {
    type: string;
    severity: string;
    contractor_id: string | null;
    verification_run_id: string;
    title: string;
    body: string;
    payload_json: Record<string, unknown>;
  }[] = [];

  if (status === "ambiguous_match") {
    notifications.push({
      type: "ambiguous_match",
      severity: "warning",
      contractor_id: contractorId,
      verification_run_id: runId,
      title: "Correspondance ambiguë détectée",
      body: `${matchCount} correspondances possibles trouvées. Révision manuelle recommandée.`,
      payload_json: { match_count: matchCount },
    });
  }

  if (status === "no_reliable_match") {
    notifications.push({
      type: "new_unknown_contractor",
      severity: "info",
      contractor_id: null,
      verification_run_id: runId,
      title: "Entrepreneur inconnu détecté",
      body: "Une vérification a été lancée pour un entrepreneur non répertorié dans la base UNPRO.",
      payload_json: {},
    });
  }

  if (liveRiskDelta !== null && Math.abs(liveRiskDelta) >= 15) {
    notifications.push({
      type: "risk_delta_significant",
      severity: liveRiskDelta < -15 ? "critical" : "warning",
      contractor_id: contractorId,
      verification_run_id: runId,
      title: `Divergence de score détectée (${liveRiskDelta > 0 ? "+" : ""}${liveRiskDelta})`,
      body: `Le score public actuel diverge significativement du score vérifié interne.`,
      payload_json: { delta: liveRiskDelta },
    });
  }

  if (hasNewEvidence) {
    notifications.push({
      type: "new_evidence_uploaded",
      severity: "info",
      contractor_id: contractorId,
      verification_run_id: runId,
      title: "Nouvelle preuve téléversée",
      body: "Un utilisateur a soumis de nouvelles preuves pour une vérification d'entrepreneur.",
      payload_json: {},
    });
  }

  if (status === "verified_internal_profile" && liveRiskDelta !== null && liveRiskDelta < -10) {
    notifications.push({
      type: "verified_profile_divergence",
      severity: "warning",
      contractor_id: contractorId,
      verification_run_id: runId,
      title: "Profil vérifié avec divergence",
      body: "Un entrepreneur ayant un profil vérifié interne montre des signaux divergents.",
      payload_json: { delta: liveRiskDelta },
    });
  }

  if (notifications.length === 0) return false;

  const { error } = await supabase.from("admin_notifications").insert(notifications);
  if (error) {
    console.error("Admin notification insert error:", error);
    return false;
  }
  return true;
}

// ══════════════════════════════════════════════════════════════
// 6. RESOLUTION LOGIC
// ══════════════════════════════════════════════════════════════

function resolveIdentityStatus(
  matches: { contractor: ContractorRow; match_method: string; match_strength: number }[],
  identityScore: number
): IdentityResolutionStatus {
  if (matches.length === 0) return "no_reliable_match";

  const best = matches[0];

  // If admin verified and strong match
  if (best.contractor.admin_verified && best.match_strength >= 0.8) {
    return "verified_internal_profile";
  }

  // Strong match without admin verification
  if (best.match_strength >= 0.8 && identityScore >= 60) {
    return "verified_match";
  }

  // Probable but needs more
  if (best.match_strength >= 0.5 && identityScore >= 30) {
    if (matches.length > 1 && matches[1].match_strength >= 0.5) {
      return "ambiguous_match";
    }
    return "probable_match_needs_more_proof";
  }

  // Multiple weak matches
  if (matches.length > 1) return "ambiguous_match";

  return "no_reliable_match";
}

/**
 * Build final recommendation — uses careful, non-absolute wording.
 * PRODUCT RULE: Never claim legal certainty. Use conditional language.
 */
function buildRecommendation(
  status: IdentityResolutionStatus,
  match: ContractorRow | null,
  identityScore: number,
  publicTrustScore: number,
  liveRiskDelta: number | null
): string {
  const safe = "Information non trouvée ou non confirmée";
  const name = match?.business_name || safe;

  switch (status) {
    case "verified_internal_profile": {
      const base = `UnPRO possède un profil vérifié en interne pour « ${name} ». Selon les données disponibles, les signaux publics sont cohérents avec ce profil vérifié.`;
      if (liveRiskDelta !== null && liveRiskDelta < -10) {
        return `${base} Cependant, certaines données publiques récentes diffèrent du profil validé. Notre équipe peut réviser ce dossier si nécessaire.`;
      }
      return base;
    }
    case "verified_match":
      return `Selon les informations publiques disponibles, les données fournies pointent fortement vers l'entreprise « ${name} ». Ce résultat est basé sur ${identityScore}/100 de correspondance estimée et un indice de confiance publique de ${publicTrustScore}/100. Ce résultat ne constitue pas une certification légale.`;
    case "probable_match_needs_more_proof":
      return `Une correspondance probable a été identifiée pour « ${name} », mais les données actuelles ne permettent pas de confirmer l'identité avec suffisamment de certitude. Fournissez jusqu'à 3 identifiants supplémentaires pour améliorer la correspondance.`;
    case "ambiguous_match":
      return `Plusieurs correspondances possibles ont été détectées. Les données fournies ne permettent pas de déterminer avec certitude à quelle entreprise elles correspondent. Ajoutez un identifiant plus précis (numéro RBQ, NEQ, site web exact) pour lever l'ambiguïté.`;
    case "no_reliable_match":
      return `Aucune entreprise n'a pu être reliée à ces données de façon suffisamment fiable. L'entrepreneur n'est peut-être pas encore répertorié dans notre base, ou les informations fournies sont insuffisantes. Cela ne signifie pas que l'entreprise est frauduleuse.`;
  }
}

function buildMissingProofs(
  inputType: SearchType,
  match: ContractorRow | null,
  identityScore: number
): string[] {
  const missing: string[] = [];
  if (identityScore >= 80) return missing;

  if (inputType !== "rbq" && (!match?.rbq_number && !match?.license_number)) {
    missing.push("Numéro de licence RBQ");
  }
  if (inputType !== "neq" && !match?.neq) {
    missing.push("Numéro d'entreprise du Québec (NEQ)");
  }
  if (inputType !== "phone" && !match?.phone) {
    missing.push("Numéro de téléphone de l'entreprise");
  }
  if (inputType !== "website" && !match?.website) {
    missing.push("Site web de l'entreprise");
  }

  return missing.slice(0, 3); // Max 3 recommendations
}

function buildRecommendedNextInputs(
  inputType: SearchType,
  status: IdentityResolutionStatus
): string[] {
  if (status === "verified_internal_profile" || status === "verified_match") return [];

  const all: Record<SearchType, string[]> = {
    phone: ["Numéro RBQ", "Site web", "Nom exact de l'entreprise"],
    name: ["Numéro de téléphone", "Numéro RBQ", "Site web"],
    rbq: ["Numéro de téléphone", "Site web", "NEQ"],
    neq: ["Numéro de téléphone", "Numéro RBQ", "Nom de l'entreprise"],
    website: ["Numéro de téléphone", "Numéro RBQ", "Nom de l'entreprise"],
    upload: ["Numéro de téléphone", "Numéro RBQ", "Nom de l'entreprise"],
  };

  return (all[inputType] || all.name).slice(0, 3);
}

// ══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      input,
      project_description,
      image_base64,
      image_type: userImageType,
      verification_run_id: existingRunId,
      source_page,
      device_type,
      referrer,
    } = body;

    const hasTextInput = input && typeof input === "string" && input.trim().length >= 2;
    const hasImage = image_base64 && typeof image_base64 === "string";

    if (!hasTextInput && !hasImage) {
      return new Response(
        JSON.stringify({ error: "Entrée requise : texte (téléphone, nom, RBQ, NEQ, site web) ou image." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Init clients ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Resolve user from auth header
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
        const token = authHeader.replace("Bearer ", "");
        const { data } = await anonClient.auth.getUser(token);
        userId = data?.user?.id || null;
      } catch { /* anonymous user is OK */ }
    }

    // ── 1. Normalize input ──
    const rawInput = hasTextInput ? input.trim() : "";
    const inputType: SearchType = hasImage && !hasTextInput ? "upload" : detectInputType(rawInput);
    let normalizedInput = "";
    switch (inputType) {
      case "phone": normalizedInput = normalizePhone(rawInput); break;
      case "name": normalizedInput = normalizeBusinessName(rawInput); break;
      case "rbq": normalizedInput = normalizeRbq(rawInput); break;
      case "neq": normalizedInput = normalizeNeq(rawInput); break;
      case "website": normalizedInput = normalizeWebsite(rawInput); break;
      default: normalizedInput = rawInput;
    }

    const inputCity = body.input_city || null;

    // ── 2. Internal identity lookup ──
    const matches = hasTextInput
      ? await findInternalMatches(supabaseAdmin, inputType, normalizedInput, rawInput, inputCity)
      : [];

    const bestMatch = matches.length > 0 ? matches[0].contractor : null;
    const matchMethod = matches.length > 0 ? matches[0].match_method : null;

    // ── 3. Load evidence if run exists ──
    let evidenceRows: EvidenceRow[] = [];
    if (existingRunId) {
      evidenceRows = await loadEvidence(supabaseAdmin, existingRunId);
    }

    // ── 4. Compute scores ──
    const { score: identityScore, breakdown: identityBreakdown } = computeIdentityConfidence(
      inputType, normalizedInput, bestMatch, evidenceRows, inputCity
    );
    // Add no-ambiguity bonus if single strong match
    const finalIdentityScore = matches.length === 1 && matches[0].match_strength >= 0.8
      ? Math.min(100, identityScore + 5)
      : identityScore;

    const { score: publicTrustScore, breakdown: trustBreakdown } = computePublicTrustScore(bestMatch, evidenceRows);

    const internalScore = bestMatch?.internal_verified_score ?? null;
    const liveRiskDelta = computeLiveRiskDelta(internalScore, publicTrustScore);

    // ── 5. Determine resolution status ──
    const status = resolveIdentityStatus(matches, finalIdentityScore);

    // ── 6. Build output fields ──
    const matchedEntity: MatchedEntity = bestMatch
      ? {
          id: bestMatch.id,
          business_name: bestMatch.business_name,
          legal_name: bestMatch.legal_name,
          phone: bestMatch.phone,
          website: bestMatch.website,
          city: bestMatch.city,
          address: bestMatch.address,
          rbq_number: bestMatch.rbq_number || bestMatch.license_number,
          neq: bestMatch.neq,
        }
      : {
          business_name: null, legal_name: null, phone: null,
          website: null, city: null, address: null, rbq_number: null, neq: null,
        };

    const internalProfile: InternalProfile = {
      found: !!bestMatch,
      admin_verified: bestMatch?.admin_verified || false,
      used_admin_verified_profile: bestMatch?.admin_verified === true && status === "verified_internal_profile",
      internal_verified_score: internalScore,
      internal_verified_at: bestMatch?.internal_verified_at || null,
      verification_status: bestMatch?.verification_status || "unknown",
    };

    const verification: VerificationDetail = {
      rbq_status: bestMatch?.rbq_number || bestMatch?.license_number
        ? "Numéro RBQ présent dans le profil"
        : "Aucun numéro RBQ trouvé",
      neq_status: bestMatch?.neq ? "NEQ présent dans le profil" : "Aucun NEQ trouvé",
      web_presence: bestMatch?.website ? `Site web détecté : ${bestMatch.website}` : "Aucun site web détecté",
      reviews_summary: bestMatch?.review_count
        ? `${bestMatch.review_count} avis, note moyenne ${bestMatch.rating || "N/A"}/5`
        : "Aucun avis trouvé",
      review_authenticity_signal: "Analyse non disponible — à intégrer",
      visual_consistency: evidenceRows.length > 0
        ? `${evidenceRows.length} pièce(s) justificative(s) analysée(s)`
        : "Aucune preuve visuelle soumise",
    };

    // Build strengths and risks
    const strengths: string[] = [];
    const risks: string[] = [];
    const inconsistencies: string[] = [];

    if (bestMatch?.admin_verified) strengths.push("Profil vérifié par l'équipe UNPRO");
    if (bestMatch?.rbq_number || bestMatch?.license_number) strengths.push("Numéro de licence RBQ présent");
    if (bestMatch?.neq) strengths.push("Numéro d'entreprise NEQ présent");
    if (bestMatch?.rating && bestMatch.rating >= 4) strengths.push(`Note élevée : ${bestMatch.rating}/5`);
    if (bestMatch?.review_count && bestMatch.review_count >= 10) strengths.push(`${bestMatch.review_count} avis clients`);
    if (bestMatch?.website) strengths.push("Site web professionnel détecté");
    if (bestMatch?.years_experience && bestMatch.years_experience >= 5) strengths.push(`${bestMatch.years_experience} ans d'expérience`);

    if (!bestMatch?.rbq_number && !bestMatch?.license_number) risks.push("Aucune licence RBQ trouvée");
    if (!bestMatch?.neq) risks.push("Aucun NEQ trouvé");
    if (!bestMatch?.website) risks.push("Aucun site web détecté");
    if (bestMatch?.review_count === 0 || !bestMatch?.review_count) risks.push("Aucun avis client trouvé");
    if (matches.length > 1) risks.push(`${matches.length} correspondances possibles — ambiguïté détectée`);

    if (liveRiskDelta !== null && liveRiskDelta < -15) {
      inconsistencies.push(`Score public (${publicTrustScore}) significativement inférieur au score vérifié (${internalScore})`);
    }

    const missingProofs = buildMissingProofs(inputType, bestMatch, finalIdentityScore);
    const recommendedNextInputs = buildRecommendedNextInputs(inputType, status);
    const recommendation = buildRecommendation(status, bestMatch, finalIdentityScore, publicTrustScore, liveRiskDelta);

    // ── 7. Save verification run ──
    const runData = {
      user_id: userId,
      input_type: inputType,
      raw_input: rawInput || "image_upload",
      normalized_phone: inputType === "phone" ? normalizedInput : null,
      contractor_id: bestMatch?.id || null,
      input_phone: inputType === "phone" ? rawInput : null,
      input_business_name: inputType === "name" ? rawInput : null,
      input_website: inputType === "website" ? rawInput : null,
      input_rbq: inputType === "rbq" ? rawInput : null,
      input_neq: inputType === "neq" ? rawInput : null,
      input_city: inputCity,
      matched_by: matchMethod,
      internal_profile_found: !!bestMatch,
      admin_verified: bestMatch?.admin_verified || false,
      used_admin_verified_profile: internalProfile.used_admin_verified_profile,
      admin_verified_snapshot_score: internalScore,
      identity_resolution_status: status,
      identity_confidence_score: finalIdentityScore,
      public_trust_score: publicTrustScore,
      live_risk_delta: liveRiskDelta,
      ambiguity_level: matches.length > 1 ? "multiple_candidates" : matches.length === 1 ? "single_candidate" : "no_candidates",
      inconsistencies_json: inconsistencies,
      missing_proofs_json: missingProofs,
      raw_findings_json: {
        identity_breakdown: identityBreakdown,
        trust_breakdown: trustBreakdown,
        match_methods: matches.map(m => ({ id: m.contractor.id, method: m.match_method, strength: m.match_strength })),
        evidence_count: evidenceRows.length,
      },
      recommended_next_inputs_json: recommendedNextInputs,
      admin_review_status: status === "ambiguous_match" || status === "no_reliable_match" ? "needs_review" : "auto_resolved",
      unpro_trust_score: publicTrustScore,
      visual_trust_score: evidenceRows.length > 0
        ? Math.round(evidenceRows.map(e => e.visual_consistency_score || 0).reduce((a, b) => a + b, 0) / evidenceRows.length)
        : null,
      verdict: publicTrustScore >= 70 && finalIdentityScore >= 60
        ? "succes"
        : publicTrustScore >= 40 && finalIdentityScore >= 30
          ? "attention"
          : publicTrustScore < 30
            ? "se_tenir_loin"
            : "non_succes",
      summary_headline: recommendation.slice(0, 200),
      summary_short: recommendation,
      summary_next_steps: recommendedNextInputs,
    };

    let runId = existingRunId;
    if (existingRunId) {
      // Update existing run
      const { error: updateErr } = await supabaseAdmin
        .from("contractor_verification_runs")
        .update(runData)
        .eq("id", existingRunId);
      if (updateErr) console.error("Run update error:", updateErr);
    } else {
      // Insert new run
      const { data: newRun, error: insertErr } = await supabaseAdmin
        .from("contractor_verification_runs")
        .insert(runData)
        .select("id")
        .single();
      if (insertErr) {
        console.error("Run insert error:", insertErr);
      } else {
        runId = newRun?.id;
      }
    }

    // Also save to contractor_verification_searches for analytics
    await supabaseAdmin.from("contractor_verification_searches").insert({
      user_id: userId || undefined,
      is_logged_in: !!userId,
      search_query: rawInput || null,
      search_type: inputType,
      normalized_phone: inputType === "phone" ? normalizedInput : null,
      detected_contractor_id: bestMatch?.id || null,
      detected_business_name: bestMatch?.business_name || null,
      detected_rbq: bestMatch?.rbq_number || bestMatch?.license_number || null,
      detected_neq: bestMatch?.neq || null,
      project_type: project_description || null,
      trust_score: publicTrustScore,
      license_fit_score: 0,
      verdict: runData.verdict,
      result_found: !!bestMatch,
      visual_validation_used: hasImage,
      contract_uploaded: userImageType === "contract",
      truck_uploaded: userImageType === "truck",
      business_card_uploaded: userImageType === "business_card",
      source_page: source_page || null,
      device_type: device_type || null,
      referrer: referrer || null,
      verification_run_id: runId || null,
    }).then(({ error }) => { if (error) console.error("Analytics insert error:", error); });

    // ── 8. Admin notifications ──
    const adminAlertCreated = runId
      ? await createAdminNotifications(
          supabaseAdmin,
          status,
          bestMatch?.id || null,
          runId,
          liveRiskDelta,
          hasImage,
          matches.length
        )
      : false;

    // ── 9. Build output contract ──
    const output: VerificationOutput = {
      identity_resolution: {
        status,
        identity_confidence_score: finalIdentityScore,
        summary: recommendation,
        matched_entity: matchedEntity,
      },
      internal_profile: internalProfile,
      verification,
      scores: {
        identity_confidence_score: finalIdentityScore,
        public_trust_score: publicTrustScore,
        internal_verified_score: internalScore,
        live_risk_delta: liveRiskDelta,
      },
      strengths,
      risks,
      inconsistencies,
      missing_proofs: missingProofs,
      recommended_next_inputs: recommendedNextInputs,
      admin: {
        admin_alert_created: adminAlertCreated,
        admin_review_status: runData.admin_review_status,
      },
      final_recommendation: recommendation,
    };

    return new Response(JSON.stringify({
      success: true,
      verification_run_id: runId,
      output,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-contractor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur interne du moteur de vérification." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/*
 * ══════════════════════════════════════════════════════════════
 * EXAMPLE REQUEST / RESPONSE
 * ══════════════════════════════════════════════════════════════
 *
 * REQUEST:
 * POST /functions/v1/verify-contractor
 * Headers: { Authorization: "Bearer <user_jwt>" }
 * Body: {
 *   "input": "514-555-0101",
 *   "input_city": "Montréal",
 *   "project_description": "Refaire ma toiture"
 * }
 *
 * RESPONSE:
 * {
 *   "success": true,
 *   "verification_run_id": "uuid-here",
 *   "output": {
 *     "identity_resolution": {
 *       "status": "verified_internal_profile",
 *       "identity_confidence_score": 85,
 *       "summary": "UNPRO possède déjà un profil vérifié...",
 *       "matched_entity": {
 *         "business_name": "Toitures Larivière Inc.",
 *         "phone": "514-555-0101",
 *         ...
 *       }
 *     },
 *     "internal_profile": {
 *       "found": true,
 *       "admin_verified": true,
 *       "used_admin_verified_profile": true,
 *       "internal_verified_score": 87,
 *       ...
 *     },
 *     "scores": {
 *       "identity_confidence_score": 85,
 *       "public_trust_score": 72,
 *       "internal_verified_score": 87,
 *       "live_risk_delta": -15
 *     },
 *     "strengths": ["Profil vérifié par l'équipe UNPRO", ...],
 *     "risks": [],
 *     "inconsistencies": [],
 *     "missing_proofs": [],
 *     "recommended_next_inputs": [],
 *     "admin": { "admin_alert_created": false, "admin_review_status": "auto_resolved" },
 *     "final_recommendation": "UNPRO possède déjà un profil vérifié..."
 *   }
 * }
 */
