/**
 * UNPRO — Entity Resolution & Duplicate Detection Service
 * Scores pairs of contractors for duplicate likelihood.
 * Never auto-merges — creates review candidates for admin action.
 */

import { supabase } from "@/integrations/supabase/client";

/* ── Signal weights ── */
const WEIGHTS = {
  exact_rbq: 95,
  exact_neq: 90,
  same_website_domain: 80,
  same_phone: 70,
  similar_name_same_city: 60,
  similar_name_only: 30,
  overlapping_areas: 15,
  same_address: 50,
  same_email_domain: 40,
} as const;

export interface DuplicateSignal {
  signal: string;
  weight: number;
  detail: string;
}

export interface DuplicateCandidate {
  contractor_id: string;
  candidate_contractor_id: string;
  confidence_score: number;
  signals: DuplicateSignal[];
  entity_confidence: string;
}

export interface EntityFlag {
  flag_type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  metadata: Record<string, any>;
}

/* ── Normalization helpers ── */
function normPhone(phone: string | null): string | null {
  if (!phone) return null;
  return phone.replace(/[^0-9]/g, "").slice(-10);
}

function normDomain(website: string | null): string | null {
  if (!website) return null;
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return website.toLowerCase().replace(/^www\./, "");
  }
}

function normName(name: string | null): string | null {
  if (!name) return null;
  return name
    .toLowerCase()
    .replace(/[^a-zàâçéèêëîïôùûüÿñ0-9\s]/g, "")
    .replace(/\b(inc|ltee|ltd|enr|cie|co|llc|senc|construction|renovations?|entreprises?|services?|les|la|le|du|des|de)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameSimilarity(a: string | null, b: string | null): number {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // Simple token overlap ratio
  const tokensA = new Set(na.split(" "));
  const tokensB = new Set(nb.split(" "));
  const intersection = [...tokensA].filter((t) => tokensB.has(t));
  const union = new Set([...tokensA, ...tokensB]);
  return union.size > 0 ? intersection.length / union.size : 0;
}

function emailDomain(email: string | null): string | null {
  if (!email || !email.includes("@")) return null;
  return email.split("@")[1]?.toLowerCase() ?? null;
}

/* ── Score a pair ── */
export function scoreDuplicatePair(
  a: Record<string, any>,
  b: Record<string, any>
): { score: number; signals: DuplicateSignal[] } {
  const signals: DuplicateSignal[] = [];

  // Exact RBQ
  if (a.license_number && b.license_number && a.license_number === b.license_number) {
    signals.push({ signal: "exact_rbq", weight: WEIGHTS.exact_rbq, detail: `RBQ ${a.license_number}` });
  }

  // NEQ
  if (a.neq && b.neq && a.neq === b.neq) {
    signals.push({ signal: "exact_neq", weight: WEIGHTS.exact_neq, detail: `NEQ ${a.neq}` });
  }

  // Same website domain
  const domA = normDomain(a.website);
  const domB = normDomain(b.website);
  if (domA && domB && domA === domB) {
    signals.push({ signal: "same_website_domain", weight: WEIGHTS.same_website_domain, detail: domA });
  }

  // Same phone
  const phoneA = normPhone(a.phone);
  const phoneB = normPhone(b.phone);
  if (phoneA && phoneB && phoneA === phoneB) {
    signals.push({ signal: "same_phone", weight: WEIGHTS.same_phone, detail: phoneA });
  }

  // Name similarity
  const simScore = nameSimilarity(a.business_name, b.business_name);
  if (simScore >= 0.7) {
    const sameCity = a.city && b.city && a.city.toLowerCase() === b.city.toLowerCase();
    if (sameCity) {
      signals.push({
        signal: "similar_name_same_city",
        weight: WEIGHTS.similar_name_same_city,
        detail: `"${a.business_name}" ≈ "${b.business_name}" (${a.city})`,
      });
    } else {
      signals.push({
        signal: "similar_name_only",
        weight: WEIGHTS.similar_name_only,
        detail: `"${a.business_name}" ≈ "${b.business_name}"`,
      });
    }
  }

  // Same email domain
  const edA = emailDomain(a.email);
  const edB = emailDomain(b.email);
  if (edA && edB && edA === edB && !["gmail.com", "outlook.com", "hotmail.com", "yahoo.com"].includes(edA)) {
    signals.push({ signal: "same_email_domain", weight: WEIGHTS.same_email_domain, detail: edA });
  }

  // Same address
  if (a.address && b.address && a.address.toLowerCase().trim() === b.address.toLowerCase().trim()) {
    signals.push({ signal: "same_address", weight: WEIGHTS.same_address, detail: a.address });
  }

  // Composite score: take the max signal + 10% of remaining
  if (signals.length === 0) return { score: 0, signals };
  const sorted = signals.map((s) => s.weight).sort((x, y) => y - x);
  const primary = sorted[0];
  const secondary = sorted.slice(1).reduce((sum, w) => sum + w * 0.1, 0);
  const score = Math.min(100, Math.round(primary + secondary));

  return { score, signals };
}

function deriveEntityConfidence(score: number): string {
  if (score >= 85) return "likely_duplicate";
  if (score >= 60) return "possible_duplicate";
  if (score >= 40) return "ambiguous_shared_identity";
  return "clear_unique";
}

/* ── Detect suspicious profile flags ── */
export function detectEntityFlags(contractor: Record<string, any>): EntityFlag[] {
  const flags: EntityFlag[] = [];

  const hasRBQ = !!contractor.license_number;
  const hasNEQ = !!contractor.neq;
  const hasPhone = !!contractor.phone;
  const hasEmail = !!contractor.email;
  const hasWebsite = !!contractor.website;
  const hasName = !!contractor.business_name;

  // Missing core identifiers
  const coreCount = [hasRBQ, hasNEQ, hasPhone, hasName].filter(Boolean).length;
  if (coreCount <= 1) {
    flags.push({
      flag_type: "missing_identity",
      severity: coreCount === 0 ? "critical" : "high",
      description: "Profil avec très peu d'identifiants vérifiables.",
      metadata: { core_count: coreCount },
    });
  }

  // No coherent business identity
  if (!hasName && !hasWebsite && !hasRBQ) {
    flags.push({
      flag_type: "low_substance",
      severity: "high",
      description: "Aucune identité d'entreprise cohérente détectable.",
      metadata: {},
    });
  }

  // Conflicting contacts — phone from one domain, email from another, name mismatched
  if (hasWebsite && hasEmail) {
    const wd = normDomain(contractor.website);
    const ed = emailDomain(contractor.email);
    if (wd && ed && wd !== ed && !["gmail.com", "outlook.com", "hotmail.com", "yahoo.com"].includes(ed)) {
      flags.push({
        flag_type: "conflicting_contacts",
        severity: "medium",
        description: `Domaine web (${wd}) diffère du domaine courriel (${ed}).`,
        metadata: { website_domain: wd, email_domain: ed },
      });
    }
  }

  return flags;
}

/* ── Admin actions ── */
export async function fetchDuplicateCandidates(status?: string) {
  let query = supabase
    .from("contractor_duplicate_candidates")
    .select("*")
    .order("duplicate_confidence_score", { ascending: false })
    .limit(200);

  if (status) {
    query = query.eq("review_status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateDuplicateReview(
  candidateId: string,
  reviewStatus: string,
  notes?: string,
  mergeDirection?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("contractor_duplicate_candidates")
    .update({
      review_status: reviewStatus,
      review_notes: notes ?? null,
      merge_direction: mergeDirection ?? null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", candidateId);

  if (error) throw error;
}

export async function fetchEntityFlags(contractorId?: string) {
  let query = supabase
    .from("contractor_entity_flags")
    .select("*")
    .eq("is_resolved", false)
    .order("created_at", { ascending: false })
    .limit(200);

  if (contractorId) {
    query = query.eq("contractor_id", contractorId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
