/**
 * UNPRO — Cohorte CRM vérifiée (v_manual_contact_queue / v_crm_next_action).
 * Logique pure et testable. Aucun envoi, aucune notification.
 *
 * L'assignation interne durable de ces dossiers passe UNIQUEMENT par
 * `crm_manual_assignments` (jamais `affiliate_assignments`, jamais une copie
 * dans `contractor_leads`).
 */

import type { RecoveryConfig } from "./logic.ts";
import { normalizeCity, normalizeCategory } from "./logic.ts";

export const CRM_SOURCE = "verified_contractor_prospects";

export interface CrmQueueRow {
  prospect_id: string;
  business_name: string | null;
  city: string | null;
  category: string | null;
  current_stage: string | null;
  priority_score: number | null;
  phone_e164: string | null;
  email: string | null;
  opted_out: boolean | null;
  assignment_id: string | null;
  affiliate_id: string | null;
}

export interface CrmEvaluation {
  prospect_id: string;
  eligible: boolean;
  /** Étape observée aujourd'hui mais volontairement non routée en v1. */
  future_eligible: boolean;
  skip_reasons: string[];
  interesting_reasons: string[];
  evidence: Record<string, unknown>;
}

/**
 * Portes dures. Conservateur par défaut : seules les étapes explicitement
 * configurées sont routables automatiquement en v1.
 */
export function evaluateCrmCandidate(
  row: CrmQueueRow,
  cfg: RecoveryConfig,
  opts: { alreadyRoutedProspectIds?: Set<string> } = {},
): CrmEvaluation {
  const skip: string[] = [];
  const stage = String(row.current_stage ?? "");

  if (row.assignment_id || row.affiliate_id) skip.push("already_assigned");
  if (row.opted_out === true) skip.push("opted_out");
  if (!(row.phone_e164 || row.email)) skip.push("no_contact_method");
  if (opts.alreadyRoutedProspectIds?.has(row.prospect_id)) skip.push("already_routed");

  const eligibleStage = cfg.crm_eligible_stages.includes(stage);
  const futureStage = cfg.crm_future_stages.includes(stage);
  if (!eligibleStage) skip.push(futureStage ? "stage_future_eligible" : "stage_not_eligible");

  const interesting: string[] = [];
  if (eligibleStage) interesting.push(`stage:${stage}`);
  if ((row.priority_score ?? 0) >= cfg.priority_score_min) {
    interesting.push(`priority_score>=${cfg.priority_score_min}`);
  }

  return {
    prospect_id: row.prospect_id,
    eligible: skip.length === 0,
    future_eligible: !eligibleStage && futureStage && skip.length === 1,
    skip_reasons: skip,
    interesting_reasons: interesting,
    evidence: {
      current_stage: stage,
      priority_score: row.priority_score,
      city: row.city,
      city_normalized: normalizeCity(row.city, cfg).normalized,
      category: row.category,
      category_normalized: normalizeCategory(row.category, cfg),
      has_phone: !!row.phone_e164,
      has_email: !!row.email,
      rule_version: cfg.version,
    },
  };
}

/** Clé d'idempotence déterministe : prospect + étape + version de règle. */
export function crmIdempotencyKey(prospectId: string, stage: string, version: string): string {
  return `auto_recovery:${prospectId}:${stage}:${version}`;
}

export function crmActionReason(stage: string): string {
  return `auto_recovery:${stage}`;
}

/** Score de routage déterministe (ordonnancement uniquement, jamais une permission). */
export function crmRoutingScore(row: CrmQueueRow, cfg: RecoveryConfig, learnedBoost = 0): number {
  const stageWeight: Record<string, number> = { checkout_opened: 300, otp_verified: 200, registered: 120 };
  const base = stageWeight[String(row.current_stage ?? "")] ?? 0;
  const priority = Math.min(Number(row.priority_score ?? 0), 100);
  const cap = Math.abs(cfg.learning.max_boost);
  const boost = Math.max(-cap, Math.min(cap, Number.isFinite(learnedBoost) ? learnedBoost : 0));
  return base + priority + boost;
}
