/**
 * UNPRO — Score de visibilité IA UNPRO dans le premier contact (STAGED).
 *
 * Destination prévue après approbation : supabase/functions/_shared/firstTouchScore.ts
 * (voir README.md). Module pur : aucune E/S, aucun envoi.
 *
 * Le seul score citable est `ai_recommendation_audits.readiness_score`, calculé
 * par le moteur déterministe `ai-recommendation-audit` (données détenues par
 * UNPRO, sans service payant) — le même nombre que montre /entrepreneurs/audit-ia.
 * Jamais : data_quality_score, acquisition_score, priorité commerciale,
 * ai_visibility_reports (autre moteur, lié à lead_id) ni une « note ChatGPT ».
 *
 * Un score n'est cité que si la ligne :
 *  - porte exactement le prospect_id visé (et baseline.matched.prospect_id identique);
 *  - provient d'un audit ancré par identifiant (source de confiance);
 *  - est `completed`, entier 0–100, daté, non futur, et âgé de ≤ SCORE_MAX_AGE_DAYS.
 * Sinon : premier message véridique sans score.
 */

export const SCORE_MAX_AGE_DAYS = 30;
/** Audits ancrés sur l'identifiant exact du prospect (jamais une recherche par nom). */
export const TRUSTED_SCORE_SOURCES = ["outreach_first_touch", "outreach_precompute"] as const;
export const PRECOMPUTE_SOURCE = "outreach_precompute";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_MS = 24 * 3600_000;

export interface AuditScoreRow {
  id: string | null;
  prospect_id: string | null;
  source: string | null;
  status: string | null;
  readiness_score: unknown;
  completed_at: string | null;
  baseline?: { matched?: { prospect_id?: string | null } | null } | null;
}

export interface VerifiedScore {
  score: number;
  computed_at: string;
  audit_id: string;
  source: string;
}

export type ScoreRejection =
  | "missing"
  | "invalid_prospect_id"
  | "wrong_prospect"
  | "unanchored"
  | "untrusted_source"
  | "not_completed"
  | "invalid_score"
  | "missing_date"
  | "future_date"
  | "stale";

export type ScoreDecision = ({ ok: true } & VerifiedScore) | { ok: false; reason: ScoreRejection };

export function evaluateAuditRow(
  prospectId: string,
  row: AuditScoreRow | null | undefined,
  now: Date = new Date(),
  maxAgeDays = SCORE_MAX_AGE_DAYS,
): ScoreDecision {
  if (!UUID_RE.test(String(prospectId ?? ""))) return { ok: false, reason: "invalid_prospect_id" };
  if (!row) return { ok: false, reason: "missing" };
  if (row.prospect_id !== prospectId) return { ok: false, reason: "wrong_prospect" };
  const matched = row.baseline?.matched?.prospect_id ?? null;
  if (matched !== prospectId) return { ok: false, reason: "unanchored" };
  if (!(TRUSTED_SCORE_SOURCES as readonly string[]).includes(String(row.source ?? ""))) {
    return { ok: false, reason: "untrusted_source" };
  }
  if (row.status !== "completed") return { ok: false, reason: "not_completed" };
  const s = row.readiness_score;
  if (typeof s !== "number" || !Number.isInteger(s) || s < 0 || s > 100) return { ok: false, reason: "invalid_score" };
  const t = row.completed_at ? Date.parse(row.completed_at) : NaN;
  if (!Number.isFinite(t) || !row.id) return { ok: false, reason: "missing_date" };
  if (t > now.getTime() + 5 * 60_000) return { ok: false, reason: "future_date" };
  if (now.getTime() - t > maxAgeDays * DAY_MS) return { ok: false, reason: "stale" };
  return { ok: true, score: s, computed_at: new Date(t).toISOString(), audit_id: row.id, source: String(row.source) };
}

/** Newest acceptable row wins; otherwise the newest row's rejection reason. */
export function resolveFirstTouchScore(
  prospectId: string,
  rows: AuditScoreRow[] | null | undefined,
  now: Date = new Date(),
  maxAgeDays = SCORE_MAX_AGE_DAYS,
): ScoreDecision {
  const sorted = [...(rows ?? [])].sort(
    (a, b) => (Date.parse(b.completed_at ?? "") || 0) - (Date.parse(a.completed_at ?? "") || 0),
  );
  let first: ScoreDecision | null = null;
  for (const r of sorted) {
    const d = evaluateAuditRow(prospectId, r, now, maxAgeDays);
    if (d.ok) return d;
    first ??= d;
  }
  return first ?? { ok: false, reason: UUID_RE.test(String(prospectId ?? "")) ? "missing" : "invalid_prospect_id" };
}

/** Validates the engine's own response to a send-time precompute (same guards). */
export function acceptPrecomputedAudit(prospectId: string, resp: any, now: Date = new Date()): ScoreDecision {
  if (!resp || resp.ok !== true) return { ok: false, reason: "missing" };
  return evaluateAuditRow(
    prospectId,
    {
      id: resp.audit_id ?? null,
      prospect_id: resp.baseline?.matched?.prospect_id ?? null,
      source: PRECOMPUTE_SOURCE,
      status: "completed",
      readiness_score: resp.readiness_score,
      completed_at: resp.generated_at ?? null,
      baseline: resp.baseline ?? null,
    },
    now,
  );
}

export function formatScoreDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Toronto",
  }).format(new Date(iso));
}

const nm = (b: string, max = 40) => (b || "votre entreprise").trim().slice(0, max);

/** Premier SMS avec score vérifié — lien audit + STOP ajoutés par smsWithLink. */
export function verifiedScoreFirstTouchSms(businessName: string, s: VerifiedScore): string {
  return (
    `Bonjour ${nm(businessName)}, votre score de visibilité IA UNPRO est de ${s.score}/100 ` +
    `(calcul UNPRO du ${formatScoreDate(s.computed_at)}, selon les données que détient UNPRO). ` +
    `Voyez le détail et comment l'améliorer :`
  );
}

const esc = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** Paragraphe courriel (HTML) — inséré seulement avec un score vérifié. */
export function verifiedScoreEmailHtml(s: VerifiedScore, auditLink: string): string {
  return (
    `<p style="font-size:16px;line-height:1.55;margin:0 0 16px 0;">Votre score de visibilité IA UNPRO est de ` +
    `<strong>${s.score}/100</strong> (calcul UNPRO du ${esc(formatScoreDate(s.computed_at))}, selon les données que détient UNPRO). ` +
    `<a href="${esc(auditLink)}" style="color:#111;">Voir le détail de votre audit</a></p>`
  );
}

/** Any score claim in a free-form override is refused: only the verified score may be quoted. */
export const SCORE_CLAIM_RE = /\bscore\b|\/\s*100\b|\bnote\b|chatgpt|openai/i;

/** Never in a first touch, whatever the variant. */
export const OVERPROMISE_RE = /chatgpt|openai|note officielle|garanti|nous avons analys/i;
