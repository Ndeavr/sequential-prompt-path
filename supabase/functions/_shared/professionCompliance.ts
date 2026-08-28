/**
 * UNPRO — Professional Compliance Engine (server-side, fail-closed).
 *
 * Single source of truth for regulated-profession enforcement on the server.
 * Frontend hiding is NEVER sufficient: every regulated recommendation, paid
 * referral, affiliate compensation, Stripe charge and Alex regulated action
 * MUST pass through `evaluateCompliance` before proceeding.
 *
 * Rules live in `public.profession_compliance_rules` (data-driven, sourced,
 * dated, reviewable). No regulatory logic is hardcoded here — only the
 * fail-closed evaluation mechanics.
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type ComplianceDecision =
  | "ALLOWED"
  | "RESTRICTED"
  | "RESTRICTED_PENDING_LEGAL_REVIEW"
  | "PENDING_REVIEW"
  | "PROHIBITED";

export type ComplianceAction =
  | "matching"
  | "appointment"
  | "advertising"
  | "paid_referral"
  | "alex_action"
  | "compensation";

export type CompensationType =
  | "membership_monthly"
  | "membership_annual"
  | "listing_subscription"
  | "appointment_fee_fixed"
  | "referral_fee_fixed"
  | "success_fee"
  | "percentage_commission"
  | "affiliate_commission";

export interface ComplianceVerdict {
  decision: ComplianceDecision;
  allowed: boolean;
  fail_closed: boolean;
  reason: string | null;
  action: string;
  compensation_type: string | null;
  alex_scope: string | null;
  profession_code: string | null;
  profession_label_fr?: string | null;
  profession_type?: string | null;
  regulator_code?: string | null;
  regulator_name?: string | null;
  requires_regulated_handoff?: boolean;
  required_disclosures?: string[];
  prohibited_claims?: string[];
  legal_review_status?: string | null;
  rule_id?: string | null;
  source_url?: string | null;
  source_last_verified_at?: string | null;
}

/** Audit event names — keep in sync with the admin Compliance Center. */
export const COMPLIANCE_EVENTS = {
  credentialChecked: "credential_checked",
  credentialVerified: "credential_verified",
  credentialFailed: "credential_failed",
  credentialExpired: "credential_expired",
  regulatedMatchingCreated: "regulated_matching_created",
  regulatedHandoff: "regulated_handoff",
  blockedAction: "compliance_rule_blocked_action",
  referralCreated: "referral_created",
  commissionBlocked: "commission_blocked",
  ruleChanged: "compliance_rule_changed",
} as const;

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

function failClosed(
  action: ComplianceAction,
  professionCode: string | null,
  reason: string,
  extra: Partial<ComplianceVerdict> = {},
): ComplianceVerdict {
  return {
    decision: "PENDING_REVIEW",
    allowed: false,
    fail_closed: true,
    reason,
    action,
    compensation_type: null,
    alex_scope: null,
    profession_code: professionCode,
    ...extra,
  };
}

/**
 * Evaluates a compliance rule. Any missing rule, unknown action, ambiguous
 * compensation type or infrastructure error resolves to PENDING_REVIEW.
 */
export async function evaluateCompliance(
  supabase: SupabaseClient,
  opts: {
    professionCode: string | null | undefined;
    action: ComplianceAction;
    compensationType?: CompensationType | string | null;
    alexScope?: string | null;
  },
): Promise<ComplianceVerdict> {
  const professionCode = opts.professionCode?.trim() || null;
  if (!professionCode) {
    return failClosed(opts.action, null, "missing_profession_code");
  }
  try {
    const { data, error } = await supabase.rpc("evaluate_profession_compliance", {
      _profession_code: professionCode,
      _action: opts.action,
      _compensation_type: opts.compensationType ?? null,
      _alex_scope: opts.alexScope ?? null,
    });
    if (error || !data) {
      return failClosed(opts.action, professionCode, `evaluation_error:${error?.message ?? "empty"}`);
    }
    return data as ComplianceVerdict;
  } catch (e) {
    return failClosed(opts.action, professionCode, `evaluation_exception:${(e as Error).message}`);
  }
}

/** Writes a compliance audit event into the existing `system_audit_logs`. */
export async function logComplianceEvent(
  supabase: SupabaseClient,
  event: {
    action: string;
    entityType: string;
    entityId: string;
    actorType?: string;
    actorId?: string | null;
    professionCode?: string | null;
    verdict?: ComplianceVerdict | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await supabase.from("system_audit_logs").insert({
      actor_type: event.actorType ?? "system",
      actor_id: event.actorId ?? null,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId,
      source: "profession_compliance_engine",
      metadata: {
        profession_code: event.professionCode ?? event.verdict?.profession_code ?? null,
        rule_id: event.verdict?.rule_id ?? null,
        decision: event.verdict?.decision ?? null,
        reason: event.verdict?.reason ?? null,
        evidence_source: event.verdict?.source_url ?? null,
        source_last_verified_at: event.verdict?.source_last_verified_at ?? null,
        ...(event.metadata ?? {}),
      },
    });
  } catch {
    // Never let audit logging break the guarded operation.
  }
}

/**
 * Fail-closed gate for monetization. Returns null when the operation may
 * proceed, otherwise a ready-to-return HTTP Response with an admin-readable
 * error. Non-regulated / undeclared-profession callers (the existing
 * contractor golden path) pass through untouched when `professionCode` is
 * absent — regulated professions are an additional branch, not a replacement.
 */
export async function assertCompensationAllowed(
  supabase: SupabaseClient,
  opts: {
    professionCode: string | null | undefined;
    compensationType: CompensationType | string;
    entityType: string;
    entityId: string;
    actorId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<{ ok: true; verdict: ComplianceVerdict | null } | { ok: false; verdict: ComplianceVerdict }> {
  const professionCode = opts.professionCode?.trim() || null;
  if (!professionCode) return { ok: true, verdict: null };

  const verdict = await evaluateCompliance(supabase, {
    professionCode,
    action: "compensation",
    compensationType: opts.compensationType,
  });

  if (verdict.allowed) return { ok: true, verdict };

  await logComplianceEvent(supabase, {
    action: COMPLIANCE_EVENTS.blockedAction,
    entityType: opts.entityType,
    entityId: opts.entityId,
    actorId: opts.actorId ?? null,
    professionCode,
    verdict,
    metadata: {
      blocked_operation: "payment_creation",
      compensation_type: opts.compensationType,
      ...(opts.metadata ?? {}),
    },
  });

  return { ok: false, verdict };
}

/** Human-readable, admin-facing error payload for a blocked verdict. */
export function complianceErrorPayload(verdict: ComplianceVerdict) {
  return {
    error: "compliance_blocked",
    decision: verdict.decision,
    reason: verdict.reason,
    profession_code: verdict.profession_code,
    regulator: verdict.regulator_name ?? verdict.regulator_code ?? null,
    admin_message:
      `Structure de rémunération « ${verdict.compensation_type ?? verdict.action} » non autorisée pour la profession ` +
      `« ${verdict.profession_label_fr ?? verdict.profession_code} » (statut: ${verdict.decision}). ` +
      `Configurez la règle dans Admin → Conformité avant de facturer.`,
    user_message:
      "Cette offre n'est pas encore disponible pour cette profession. Notre équipe valide la conformité réglementaire.",
    rule_id: verdict.rule_id ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Advertising claims — separate matching from endorsement            */
/* ------------------------------------------------------------------ */

/** Unverifiable superlatives blocked on regulated-profession surfaces. */
export const UNVERIFIABLE_CLAIM_PATTERNS: RegExp[] = [
  /\bn[°ºo]\s?1\b/gi,
  /#\s?1\b/g,
  /\bnum[ée]ro\s+un\b/gi,
  /\ble\s+meilleur\b/gi,
  /\bla\s+meilleure\b/gi,
  /\bles\s+meilleurs\b/gi,
  /\bbest\b/gi,
  /\btop\s?1\b/gi,
  /\bgaranti\s+le\s+moins\s+cher\b/gi,
  /\b(recommand[ée]|approuv[ée])\s+par\s+(la\s+)?(RBQ|AMF|OACIQ|OIQ|OAQ|CMEQ|CMMTQ|CNQ|OTPQ)\b/gi,
];

export interface ClaimScanResult {
  clean: boolean;
  matches: string[];
  sanitized: string;
}

/**
 * Scans marketing copy for unverifiable superlatives and regulator-endorsement
 * implications. `extraClaims` comes from the profession rule (data-driven).
 */
export function scanProhibitedClaims(text: string, extraClaims: string[] = []): ClaimScanResult {
  if (!text) return { clean: true, matches: [], sanitized: "" };
  const matches: string[] = [];
  let sanitized = text;

  for (const pattern of UNVERIFIABLE_CLAIM_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    const found = sanitized.match(re);
    if (found) {
      matches.push(...found.map((m) => m.trim()));
      sanitized = sanitized.replace(re, "sélectionné par UNPRO");
    }
  }

  for (const claim of extraClaims) {
    if (!claim) continue;
    const re = new RegExp(claim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (re.test(sanitized)) {
      matches.push(claim);
      sanitized = sanitized.replace(re, "sélectionné par UNPRO");
    }
  }

  return { clean: matches.length === 0, matches: [...new Set(matches)], sanitized };
}

/** Evidence-based selection sentence used instead of endorsement language. */
export const UNPRO_SELECTION_STATEMENT =
  "Sélectionné par UNPRO selon vos critères et nos données vérifiées.";

export const UNPRO_REGULATED_DISCLOSURE =
  "UNPRO facilite la sélection et la mise en relation avec des professionnels. " +
  "Les conseils et services professionnels réglementés sont fournis par le professionnel concerné.";
