/**
 * Before selecting/recommending a contractor, clarify UNKNOWN relevant capabilities
 * with plausible companies, one question at a time. Answers are DECLARED by the
 * contractor, never technically verified. Unknown ≠ not offered, unknown ≠ eligible.
 * Pure helpers: sending goes through existing queues (dedupe, caps, suppression).
 */
export type CapabilityKey = "work_type" | "insurance_claim_jobs";
// Separate dimensions: a yes on one never proves another.
export type Separate = "professional_insurance" | "licence" | "capacity";

export type CapabilityAnswer = {
  key: CapabilityKey;
  scope: string; // e.g. "isolation_toit_plat"
  value: "yes" | "no";
  status: "declared"; // never "verified"
  source: string; // channel/message id
  answered_at: string; // ISO
};
export type CapabilityAsk = { company_id: string; key: CapabilityKey; scope: string; asked_at: string };

export type Requirement = { key: CapabilityKey; scope: string; question_fr: string; question_en: string };

export const dedupeKey = (companyId: string, key: CapabilityKey, scope: string) => `cap:${companyId}:${key}:${scope}`;

const find = (answers: CapabilityAnswer[], r: Requirement) => answers.find(a => a.key === r.key && a.scope === r.scope);

export type CapabilityState = "compatible_declared" | "excluded_for_need" | "pending" | "unknown";

/** Status of one company for one need. Non-response = pending, never yes. */
export function capabilityState(reqs: Requirement[], answers: CapabilityAnswer[], asks: CapabilityAsk[], companyId: string): CapabilityState {
  for (const r of reqs) {
    const a = find(answers, r);
    if (a?.value === "no") return "excluded_for_need";
  }
  for (const r of reqs) {
    if (!find(answers, r)) return asks.some(x => x.company_id === companyId && x.key === r.key && x.scope === r.scope) ? "pending" : "unknown";
  }
  return "compatible_declared";
}

/** Next single question for a company, or null (already asked, answered, or excluded). No client data in payload. */
export function nextClarification(reqs: Requirement[], answers: CapabilityAnswer[], asks: CapabilityAsk[], companyId: string, sentKeys: Set<string> = new Set()) {
  if (reqs.some(r => find(answers, r)?.value === "no")) return null; // explicit exclusion: no incompatible solicitation
  for (const r of reqs) {
    if (find(answers, r)) continue;
    const k = dedupeKey(companyId, r.key, r.scope);
    if (sentKeys.has(k) || asks.some(x => x.company_id === companyId && x.key === r.key && x.scope === r.scope)) return null; // wait for answer
    return { dedupe_key: k, company_id: companyId, key: r.key, scope: r.scope, question_fr: r.question_fr, question_en: r.question_en };
  }
  return null;
}

/** Refusal excludes only this need; the company stays eligible for others. */
export function isExcludedGlobally(): false { return false; }

/** Recommendation/alert allowed only after declared compatibility AND server-side registration/verification. */
export function mayRecommend(state: CapabilityState, server: { registered: boolean; eligible_server: boolean }): boolean {
  return state === "compatible_declared" && server.registered && server.eligible_server;
}

export function recordAnswer(key: CapabilityKey, scope: string, value: "yes" | "no", source: string, at: string): CapabilityAnswer {
  return { key, scope, value, status: "declared", source, answered_at: at };
}

/** Contradiction between answers for same key/scope → targeted clarification; human review only if ambiguous and high potential. */
export function contradictionAction(answers: CapabilityAnswer[], highPotential: boolean): "none" | "clarify" | "human_review" {
  const seen = new Map<string, string>(); let conflict = false;
  for (const a of answers) { const k = a.key + a.scope; if (seen.has(k) && seen.get(k) !== a.value) conflict = true; seen.set(k, a.value); }
  return !conflict ? "none" : highPotential ? "human_review" : "clarify";
}
