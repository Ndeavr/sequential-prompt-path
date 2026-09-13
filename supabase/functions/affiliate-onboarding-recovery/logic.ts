/**
 * UNPRO — Reprise d'onboarding incomplet : logique pure et testable.
 * Aucune dépendance réseau. Aucun envoi. Routage interne uniquement.
 *
 * Toutes les règles sont issues de `optimization_rules.rule_key =
 * 'affiliate_incomplete_onboarding_recovery'` (config_json), jamais de
 * constantes cachées non modifiables.
 */

export const RECOVERY_RULE_KEY = "affiliate_incomplete_onboarding_recovery";
export const RECOVERY_EVENT_TYPE = "onboarding_recovery_routed";
export const RECOVERY_TACTIC_KEY = "affiliate_incomplete_onboarding_recovery";

export interface RecoveryConfig {
  version: string;
  inactivity_hours: number;
  fit_score_min: number;
  priority_score_min: number;
  max_candidates: number;
  learning: { min_sample: number; min_terminal: number; max_boost: number };
  /** Normalisation géographique documentée et déterministe (arrondissement → ville). */
  city_normalization: Record<string, string>;
  category_aliases: Record<string, string>;
  /** Étapes CRM vérifiées routables automatiquement en v1. */
  crm_eligible_stages: string[];
  /** Étapes observées mais volontairement non routées (visibles en simulation). */
  crm_future_stages: string[];
}

/** Arrondissements de Montréal — normalisation géographique documentée. */
const MONTREAL_BOROUGHS = [
  "ahuntsic-cartierville",
  "anjou",
  "cote-des-neiges-notre-dame-de-grace",
  "lachine",
  "lasalle",
  "le-plateau-mont-royal",
  "le-sud-ouest",
  "lile-bizard-sainte-genevieve",
  "mercier-hochelaga-maisonneuve",
  "montreal-nord",
  "outremont",
  "pierrefonds-roxboro",
  "riviere-des-prairies-pointe-aux-trembles",
  "rosemont-la-petite-patrie",
  "saint-laurent",
  "saint-leonard",
  "verdun",
  "ville-marie",
  "villeray-saint-michel-parc-extension",
];

export const DEFAULT_RECOVERY_CONFIG: RecoveryConfig = {
  version: "v1",
  inactivity_hours: 24,
  fit_score_min: 70,
  priority_score_min: 70,
  max_candidates: 200,
  learning: { min_sample: 30, min_terminal: 10, max_boost: 10 },
  crm_eligible_stages: ["checkout_opened", "otp_verified", "registered"],
  crm_future_stages: ["landing_viewed", "clicked", "invited", "not_started"],
  city_normalization: Object.fromEntries(MONTREAL_BOROUGHS.map((b) => [b, "montreal"])),
  category_aliases: {
    toiture: "toiture",
    toitures: "toiture",
    couvreur: "toiture",
    couvreurs: "toiture",
    roofing: "toiture",
    plomberie: "plomberie",
    plombier: "plomberie",
    plumbing: "plomberie",
    electricite: "electricite",
    electricien: "electricite",
    electrical: "electricite",
    renovation: "renovation",
    "renovation-generale": "renovation",
  },
};

export function mergeConfig(raw: unknown): RecoveryConfig {
  const c = (raw ?? {}) as Partial<RecoveryConfig>;
  return {
    ...DEFAULT_RECOVERY_CONFIG,
    ...c,
    learning: { ...DEFAULT_RECOVERY_CONFIG.learning, ...(c.learning ?? {}) },
    city_normalization: { ...DEFAULT_RECOVERY_CONFIG.city_normalization, ...(c.city_normalization ?? {}) },
    category_aliases: { ...DEFAULT_RECOVERY_CONFIG.category_aliases, ...(c.category_aliases ?? {}) },
  };
}

export function slugify(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeCity(city: string | null | undefined, cfg: RecoveryConfig) {
  const raw = slugify(city);
  const mapped = cfg.city_normalization[raw];
  return { raw, normalized: mapped ?? raw, mapped: !!mapped };
}

export function normalizeCategory(value: string | null | undefined, cfg: RecoveryConfig): string {
  const raw = slugify(value);
  return cfg.category_aliases[raw] ?? raw;
}

export interface LeadRow {
  id: string;
  company_name: string | null;
  business_name?: string | null;
  city: string | null;
  category_primary: string | null;
  trade: string | null;
  fit_score: number | null;
  priority_score: number | null;
  priority_level?: string | null;
  profile_status: string | null;
  onboarding_started_at: string | null;
  payment_started_at: string | null;
  paid_at: string | null;
  profile_active_at: string | null;
  updated_at: string | null;
  archived_at: string | null;
  do_not_contact: boolean | null;
  unsubscribed_at: string | null;
  compliance_review_required: boolean | null;
  assigned_affiliate_id: string | null;
  created_by_affiliate_id?: string | null;
  phone_e164: string | null;
  phone: string | null;
  email: string | null;
}

export interface CandidateEvaluation {
  lead_id: string;
  eligible: boolean;
  skip_reasons: string[];
  inactivity_hours: number | null;
  evidence: Record<string, unknown>;
  interesting_reasons: string[];
}

export function hoursSince(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (nowMs - t) / 3600000;
}

/** Évalue un lead selon les seuils configurés. Aucune donnée inventée. */
export function evaluateCandidate(
  lead: LeadRow,
  cfg: RecoveryConfig,
  nowMs: number,
  opts: { alreadyRoutedLeadIds?: Set<string> } = {},
): CandidateEvaluation {
  const skip: string[] = [];

  if (!lead.onboarding_started_at) skip.push("onboarding_not_started");
  if (String(lead.profile_status ?? "") === "complete") skip.push("profile_complete");
  if (lead.paid_at) skip.push("already_paid");
  if (lead.profile_active_at) skip.push("profile_active");
  if (lead.archived_at) skip.push("archived");
  if (lead.do_not_contact === true) skip.push("do_not_contact");
  if (lead.unsubscribed_at) skip.push("unsubscribed");
  if (lead.compliance_review_required === true) skip.push("compliance_review_required");
  if (!(lead.phone_e164 || lead.phone || lead.email)) skip.push("no_contact_method");
  if (lead.assigned_affiliate_id) skip.push("already_owned");
  // Un dossier créé par une affiliée lui appartient déjà : jamais réattribué.
  if (lead.created_by_affiliate_id) skip.push("owned_by_creator");
  if (opts.alreadyRoutedLeadIds?.has(lead.id)) skip.push("already_routed");

  const lastActivityIso =
    [lead.updated_at, lead.payment_started_at, lead.onboarding_started_at]
      .filter(Boolean)
      .map((v) => String(v))
      .sort()
      .pop() ?? null;
  const inactivity = hoursSince(lastActivityIso, nowMs);
  if (inactivity === null || inactivity < cfg.inactivity_hours) skip.push("still_active_within_window");

  const interesting: string[] = [];
  if ((lead.fit_score ?? 0) >= cfg.fit_score_min) interesting.push(`fit_score>=${cfg.fit_score_min}`);
  if ((lead.priority_score ?? 0) >= cfg.priority_score_min) interesting.push(`priority_score>=${cfg.priority_score_min}`);
  if (lead.payment_started_at) interesting.push("payment_started");
  if (interesting.length === 0) skip.push("not_interesting");

  return {
    lead_id: lead.id,
    eligible: skip.length === 0,
    skip_reasons: skip,
    inactivity_hours: inactivity === null ? null : Math.round(inactivity * 10) / 10,
    interesting_reasons: interesting,
    evidence: {
      fit_score: lead.fit_score,
      priority_score: lead.priority_score,
      profile_status: lead.profile_status,
      onboarding_started_at: lead.onboarding_started_at,
      payment_started_at: lead.payment_started_at,
      last_activity_at: lastActivityIso,
      rule_version: cfg.version,
    },
  };
}

export interface AffiliateRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  status: string | null;
  suspended_at: string | null;
  archived_at: string | null;
  primary_city: string | null;
  territories: string[] | null;
  allowed_categories: string[] | null;
  daily_quota: number | null;
}

export interface MatchResult {
  affiliate_id: string | null;
  affiliate_label: string | null;
  reasons: string[];
  rejected: Array<{ affiliate_id: string; reason: string }>;
}

/**
 * Compatibilité explicite exigée : une configuration vide ne signifie jamais
 * « aucune restriction ». Départage par charge courante, puis boost appris borné.
 */
export function matchAffiliate(
  lead: LeadRow,
  cfg: RecoveryConfig,
  affiliates: AffiliateRow[],
  workload: Record<string, number>,
  learnedBoost: Record<string, number> = {},
): MatchResult {
  return matchAffiliateFor(lead.city, lead.category_primary ?? lead.trade, cfg, affiliates, workload, learnedBoost);
}

/**
 * Appariement générique ville/catégorie, partagé par la cohorte
 * `contractor_leads` et la cohorte CRM vérifiée.
 */
export function matchAffiliateFor(
  cityRaw: string | null | undefined,
  categoryRaw: string | null | undefined,
  cfg: RecoveryConfig,
  affiliates: AffiliateRow[],
  workload: Record<string, number>,
  learnedBoost: Record<string, number> = {},
): MatchResult {
  const leadCity = normalizeCity(cityRaw, cfg);
  const leadCategory = normalizeCategory(categoryRaw, cfg);
  const rejected: MatchResult["rejected"] = [];
  const eligible: Array<{ a: AffiliateRow; reasons: string[]; load: number; boost: number }> = [];

  for (const a of affiliates) {
    if (a.archived_at) { rejected.push({ affiliate_id: a.id, reason: "archived" }); continue; }
    if (a.suspended_at) { rejected.push({ affiliate_id: a.id, reason: "suspended" }); continue; }
    if (String(a.status ?? "") !== "active") { rejected.push({ affiliate_id: a.id, reason: "not_active" }); continue; }

    const cats = (a.allowed_categories ?? []).map((c) => normalizeCategory(c, cfg)).filter(Boolean);
    const terrs = [...(a.territories ?? []), a.primary_city]
      .map((t) => normalizeCity(t, cfg).normalized)
      .filter(Boolean);

    if (cats.length === 0) { rejected.push({ affiliate_id: a.id, reason: "no_category_configured" }); continue; }
    if (terrs.length === 0) { rejected.push({ affiliate_id: a.id, reason: "no_territory_configured" }); continue; }
    if (!leadCategory) { rejected.push({ affiliate_id: a.id, reason: "lead_category_unknown" }); continue; }
    if (!leadCity.normalized) { rejected.push({ affiliate_id: a.id, reason: "lead_city_unknown" }); continue; }
    if (!cats.includes(leadCategory)) { rejected.push({ affiliate_id: a.id, reason: "category_mismatch" }); continue; }
    if (!terrs.includes(leadCity.normalized)) { rejected.push({ affiliate_id: a.id, reason: "territory_mismatch" }); continue; }

    const load = workload[a.id] ?? 0;
    if (a.daily_quota != null && load >= a.daily_quota) {
      rejected.push({ affiliate_id: a.id, reason: "daily_quota_reached" });
      continue;
    }
    const reasons = [
      `category_match:${leadCategory}`,
      leadCity.mapped
        ? `territory_match:${leadCity.raw}->${leadCity.normalized} (normalisation géographique ${cfg.version})`
        : `territory_match:${leadCity.normalized}`,
    ];
    eligible.push({ a, reasons, load, boost: clampBoost(learnedBoost[a.id] ?? 0, cfg) });
  }

  if (eligible.length === 0) {
    return { affiliate_id: null, affiliate_label: null, reasons: [], rejected };
  }

  eligible.sort((x, y) => (y.boost - x.boost) || (x.load - y.load) || x.a.id.localeCompare(y.a.id));
  const winner = eligible[0];
  const label = [winner.a.first_name, winner.a.last_name].filter(Boolean).join(" ").trim() || winner.a.name || winner.a.id;
  const reasons = [...winner.reasons, `workload_today:${winner.load}`];
  if (winner.boost !== 0) reasons.push(`learned_boost:${winner.boost}`);
  return { affiliate_id: winner.a.id, affiliate_label: label, reasons, rejected };
}

export function clampBoost(value: number, cfg: RecoveryConfig): number {
  const cap = Math.abs(cfg.learning.max_boost);
  if (!Number.isFinite(value)) return 0;
  return Math.max(-cap, Math.min(cap, value));
}

export interface LearningRollup {
  attempts: number;
  delivered: number; // vus par l'affilié
  clicked: number; // appel initié
  signups: number; // onboarding repris
  activations: number; // profil activé
  conversions: number; // payé
}

/**
 * Calcule un boost appris par affilié, borné, seulement si l'échantillon réel
 * atteint les seuils configurés. Sinon 0 (ordonnancement déterministe v1).
 */
export function computeLearnedBoosts(
  rollups: Record<string, LearningRollup>,
  cfg: RecoveryConfig,
): { boosts: Record<string, number>; applied: boolean; sample: number; terminal: number } {
  const entries = Object.entries(rollups);
  const sample = entries.reduce((s, [, r]) => s + r.attempts, 0);
  const terminal = entries.reduce((s, [, r]) => s + r.activations + r.conversions, 0);
  if (sample < cfg.learning.min_sample || terminal < cfg.learning.min_terminal) {
    return { boosts: {}, applied: false, sample, terminal };
  }
  const rates = entries.map(([id, r]) => [id, r.attempts > 0 ? (r.activations + r.conversions) / r.attempts : 0] as const);
  const mean = rates.reduce((s, [, v]) => s + v, 0) / (rates.length || 1);
  const boosts: Record<string, number> = {};
  for (const [id, rate] of rates) {
    boosts[id] = clampBoost(Math.round((rate - mean) * 100), cfg);
  }
  return { boosts, applied: true, sample, terminal };
}
