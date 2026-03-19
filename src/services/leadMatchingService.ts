/**
 * UNPRO — Lead Matching Service
 * Scores and ranks contractors/brokers for a given lead,
 * writes results to the `matches` table.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

interface LeadRow {
  id: string;
  lead_type: "contractor" | "broker";
  city: string | null;
  project_category: string | null;
  specialty_needed: string | null;
  budget_min: number | null;
  budget_max: number | null;
  language: string | null;
  urgency: string | null;
}

interface ContractorCandidate {
  id: string;
  company_name: string;
  city: string | null;
  service_areas: string[];
  specialties: string[];
  sub_specialties: string[];
  languages: string[];
  min_job_value: number | null;
  max_job_value: number | null;
  years_experience: number | null;
}

interface BrokerCandidate {
  id: string;
  agency_name: string | null;
  city: string | null;
  service_areas: string[];
  specialties: string[];
  languages: string[];
  avg_price_min: number | null;
  avg_price_max: number | null;
  years_experience: number | null;
}

interface ScoredMatch {
  entityId: string;
  entityType: "contractor" | "broker";
  score: number;
  reasons: string[];
}

// ─── Contractor Scoring ───

function scoreContractor(c: ContractorCandidate, lead: LeadRow): ScoredMatch {
  let score = 0;
  const reasons: string[] = [];

  // Zone match (25 pts)
  if (lead.city && (c.service_areas?.includes(lead.city) || c.city === lead.city)) {
    score += 25;
    reasons.push("Dessert la zone");
  }

  // Specialty match (20 pts)
  if (lead.project_category && c.specialties?.includes(lead.project_category)) {
    score += 20;
    reasons.push("Bonne spécialité");
  }

  // Sub-specialty match (15 pts)
  if (lead.specialty_needed && c.sub_specialties?.includes(lead.specialty_needed)) {
    score += 15;
    reasons.push("Sous-spécialité exacte");
  }

  // Budget fit (10 pts)
  const budgetFit =
    (!c.min_job_value || (lead.budget_max ?? Infinity) >= c.min_job_value) &&
    (!c.max_job_value || (lead.budget_min ?? 0) <= c.max_job_value);
  if (budgetFit) {
    score += 10;
    reasons.push("Compatible avec le budget");
  }

  // Language match (5 pts)
  if (lead.language && c.languages?.includes(lead.language)) {
    score += 5;
    reasons.push("Même langue");
  }

  // Experience bonus (up to 10 pts)
  if (c.years_experience) {
    score += Math.min(c.years_experience, 10);
    reasons.push(`${c.years_experience} ans d'expérience`);
  }

  return { entityId: c.id, entityType: "contractor", score: Math.min(score, 100), reasons };
}

// ─── Broker Scoring ───

function scoreBroker(b: BrokerCandidate, lead: LeadRow): ScoredMatch {
  let score = 0;
  const reasons: string[] = [];

  // Zone match (25 pts)
  if (lead.city && (b.service_areas?.includes(lead.city) || b.city === lead.city)) {
    score += 25;
    reasons.push("Dessert la zone");
  }

  // Specialty match (20 pts)
  if (lead.project_category && b.specialties?.includes(lead.project_category)) {
    score += 20;
    reasons.push("Spécialité correspondante");
  }

  // Price range fit (15 pts)
  const priceFit =
    (!b.avg_price_min || (lead.budget_max ?? Infinity) >= b.avg_price_min) &&
    (!b.avg_price_max || (lead.budget_min ?? 0) <= b.avg_price_max);
  if (priceFit) {
    score += 15;
    reasons.push("Gamme de prix compatible");
  }

  // Language match (5 pts)
  if (lead.language && b.languages?.includes(lead.language)) {
    score += 5;
    reasons.push("Même langue");
  }

  // Experience bonus (up to 10 pts)
  if (b.years_experience) {
    score += Math.min(b.years_experience, 10);
    reasons.push(`${b.years_experience} ans d'expérience`);
  }

  return { entityId: b.id, entityType: "broker", score: Math.min(score, 100), reasons };
}

// ─── Main Matching Function ───

export async function matchLead(leadId: string): Promise<ScoredMatch[]> {
  // 1. Fetch lead
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) throw new Error("Lead introuvable");

  const typedLead = lead as unknown as LeadRow;
  let scored: ScoredMatch[] = [];

  if (typedLead.lead_type === "contractor") {
    // 2a. Fetch contractor candidates
    const { data: contractors } = await supabase
      .from("contractors")
      .select("id, company_name, city, service_areas, specialties, sub_specialties, languages, min_job_value, max_job_value, years_experience");

    if (contractors) {
      scored = (contractors as unknown as ContractorCandidate[])
        .map((c) => scoreContractor(c, typedLead))
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    }
  } else {
    // 2b. Fetch broker candidates
    const { data: brokers } = await supabase
      .from("broker_profiles")
      .select("id, agency_name, city, service_areas, specialties, languages, avg_price_min, avg_price_max, years_experience");

    if (brokers) {
      scored = (brokers as unknown as BrokerCandidate[])
        .map((b) => scoreBroker(b, typedLead))
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    }
  }

  // 3. Write matches
  if (scored.length > 0) {
    const matchRows = scored.map((m, i) => ({
      lead_id: leadId,
      match_type: m.entityType as "contractor" | "broker",
      contractor_id: m.entityType === "contractor" ? m.entityId : null,
      broker_id: m.entityType === "broker" ? m.entityId : null,
      score: m.score,
      rank_position: i + 1,
      reasons: m.reasons,
      status: "suggested",
    }));

    const { error: insertError } = await supabase
      .from("matches")
      .insert(matchRows);

    if (insertError) throw new Error(`Erreur insertion matches: ${insertError.message}`);

    // 4. Update lead status
    await supabase
      .from("leads")
      .update({ status: "matched" })
      .eq("id", leadId);
  }

  return scored;
}

// ─── Market Capacity Check ───

export async function checkMarketCapacity(city: string, specialty: string) {
  const { data } = await supabase
    .from("market_capacity")
    .select("*")
    .eq("city", city)
    .eq("specialty", specialty)
    .maybeSingle();

  if (!data) return { status: "available" as const, slots_remaining: 3 };

  const remaining = data.max_slots - data.active_slots;
  if (remaining <= 0) return { status: "waitlist" as const, slots_remaining: 0, waiting: data.waiting_list_count };
  if (remaining === 1) return { status: "almost_full" as const, slots_remaining: 1 };
  return { status: "available" as const, slots_remaining: remaining };
}
