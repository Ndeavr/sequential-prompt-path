/**
 * General rule (all 3 universes: renovation/construction, maintenance/services,
 * real-estate/professionals): a confirmed, qualified homeowner demand with no
 * eligible contractor gets PRIORITY service × territory recruitment in the
 * existing queues, ahead of generic prospecting. Priority never lifts
 * eligibility, evidence, consent, suppression, caps or hours.
 * Pure helpers only: no queue, cron or sender here.
 */
export type Universe = "renovation" | "services" | "real_estate";
export type Demand = {
  id: string;
  owner_id: string;
  universe?: Universe | null;
  service?: string | null;
  needs?: string | null;
  city?: string | null;
  postal_code?: string | null;
  address?: string | null;
  confirmed_by_client?: boolean;
  suspended?: boolean; // e.g. post-fire access prohibited/unknown
  // Private fields that must never leave the homeowner record during prospecting.
  name?: string | null; email?: string | null; phone?: string | null; documents?: unknown[];
};

export function missingForRecruitment(d: Demand): string[] {
  const m: string[] = [];
  if (!d.universe) m.push("universe");
  if (!d.service) m.push("service");
  if (!d.needs || d.needs.trim().length < 10) m.push("needs");
  if (!d.address && !d.postal_code && !d.city) m.push("location");
  if (!d.confirmed_by_client) m.push("confirmation");
  return m;
}

/** Incomplete or suspended demand: Clara collects missing details; no broad search. */
export function canStartPriorityRecruitment(d: Demand): boolean {
  return !d.suspended && missingForRecruitment(d).length === 0;
}

const norm = (s?: string | null) => (s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
/** Territory = city or FSA (3 first postal chars) only; never the exact address. */
export function territoryOf(d: Demand): string {
  const fsa = (d.postal_code ?? "").replace(/\s/g, "").slice(0, 3).toUpperCase();
  return fsa.length === 3 ? fsa : norm(d.city);
}

/** One recruitment need per service × territory; private demands are linked, never merged or exposed. */
export function recruitmentNeedKey(d: Demand): string {
  return `${d.universe}:${norm(d.service)}:${territoryOf(d)}`;
}

/** Anonymized summary for solicitation: sector + work only. */
export function anonymizedRecruitmentSummary(d: Demand) {
  return { universe: d.universe, service: d.service, territory: territoryOf(d), needs_summary: (d.needs ?? "").slice(0, 280) };
}

export const PRIORITY_DEMAND = 100;
export const PRIORITY_GENERIC = 10;
export function recruitmentPriority(source: "client_demand" | "generic"): number {
  return source === "client_demand" ? PRIORITY_DEMAND : PRIORITY_GENERIC;
}

/** Order existing queue items: client-demand needs first; compliance filtering happens elsewhere and is unchanged. */
export function orderRecruitmentQueue<T extends { source: "client_demand" | "generic"; created_at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => recruitmentPriority(b.source) - recruitmentPriority(a.source) || a.created_at.localeCompare(b.created_at));
}

export type ContractorEvidence = { registered: boolean; eligible_server: boolean; licence_verified_or_not_required: boolean; serves_territory: boolean; covers_service: boolean };
export function alertKey(demandId: string, contractorId: string) { return `pro_found:${demandId}:${contractorId}`; }
/** A single private alert only when registered AND server-eligible; otherwise state stays "recherche en cours". */
export function shouldCreateProFoundAlert(e: ContractorEvidence): boolean {
  return e.registered && e.eligible_server && e.licence_verified_or_not_required && e.serves_territory && e.covers_service;
}
