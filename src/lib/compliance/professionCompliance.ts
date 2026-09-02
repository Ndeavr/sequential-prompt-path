/**
 * UNPRO — Professional Compliance (client layer).
 *
 * IMPORTANT: no regulatory logic lives here. This module only carries types,
 * display labels and thin calls to the server-side authority
 * (`compliance-guard` edge function / `evaluate_profession_compliance` RPC).
 * The server is always the decision maker and always fails closed.
 */
import { supabase } from "@/integrations/supabase/client";

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

export type VerificationState = "VERIFIED" | "DECLARED" | "INFERRED" | "PENDING";
export type CredentialStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "SUSPENDED"
  | "UNVERIFIED"
  | "PENDING_REVIEW";

export interface ComplianceVerdict {
  decision: ComplianceDecision;
  allowed: boolean;
  fail_closed: boolean;
  reason: string | null;
  action: string;
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

export interface ProfessionComplianceRule {
  id: string;
  profession_code: string;
  profession_label_fr: string;
  profession_type: string;
  regulator_code: string | null;
  regulator_name: string | null;
  regulator_url: string | null;
  credential_type: string | null;
  credential_required: boolean;
  credential_expiry_required: boolean;
  automated_verification_available: boolean;
  matching_allowed: boolean;
  appointment_allowed: boolean;
  advertising_allowed: boolean;
  paid_referral_status: string;
  requires_regulated_handoff: boolean;
  compensation_rules: Record<string, string>;
  required_disclosures: string[];
  prohibited_claims: string[];
  legal_review_status: string;
  source_url: string | null;
  source_reference: string | null;
  source_last_verified_at: string | null;
  is_active: boolean;
  updated_at: string;
}

/* ── Display labels (fr-CA) ─────────────────────────────────────── */

export const VERIFICATION_STATE_LABELS: Record<VerificationState, string> = {
  VERIFIED: "Vérifié",
  DECLARED: "Déclaré",
  INFERRED: "Inféré",
  PENDING: "En attente",
};

export const CREDENTIAL_STATUS_LABELS: Record<CredentialStatus, string> = {
  ACTIVE: "Actif",
  EXPIRED: "Expiré",
  SUSPENDED: "Suspendu",
  UNVERIFIED: "Non vérifié",
  PENDING_REVIEW: "En révision",
};

export const DECISION_LABELS: Record<string, string> = {
  ALLOWED: "Autorisé",
  RESTRICTED: "Restreint",
  RESTRICTED_PENDING_LEGAL_REVIEW: "Restreint — révision juridique",
  PENDING_REVIEW: "En révision",
  PROHIBITED: "Interdit",
};

export const COMPENSATION_LABELS: Record<CompensationType, string> = {
  membership_monthly: "Abonnement mensuel",
  membership_annual: "Abonnement annuel",
  listing_subscription: "Abonnement d'inscription",
  appointment_fee_fixed: "Frais fixe par rendez-vous",
  referral_fee_fixed: "Frais de référence fixe",
  success_fee: "Honoraires de succès",
  percentage_commission: "Commission en pourcentage",
  affiliate_commission: "Commission d'affiliation",
};

export const COMPENSATION_TYPES = Object.keys(COMPENSATION_LABELS) as CompensationType[];

/** Evidence-based selection statement. UNPRO never implies endorsement. */
export const UNPRO_SELECTION_STATEMENT =
  "Sélectionné par UNPRO selon vos critères et nos données vérifiées.";

export const UNPRO_REGULATED_DISCLOSURE =
  "UNPRO facilite la sélection et la mise en relation avec des professionnels. " +
  "Les conseils et services professionnels réglementés sont fournis par le professionnel concerné.";

/* ── Claim scanner (mirror of the server rules, UI-side pre-check) ── */

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
  /\b(recommand[ée]|approuv[ée]|certifi[ée]|endoss[ée])\s+par\s+(la\s+|le\s+|l['’])?(RBQ|AMF|OACIQ|OIQ|OAQ|CMEQ|CMMTQ|CNQ|OTPQ)\b/gi,
];

/** Builds a tolerant matcher for a data-driven prohibited claim. */
function claimPattern(claim: string): RegExp {
  const src = claim
    .trim()
    .split(/\s+/)
    .map((w) =>
      w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/['’]/g, "['’\\s]?"),
    )
    .join("\\s+");
  return new RegExp(`${src}\\w*`, "gi");
}

export function scanProhibitedClaims(
  text: string,
  extraClaims: string[] = [],
): { clean: boolean; matches: string[]; sanitized: string } {
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
  // Longest claims first so a shorter claim never truncates a longer one.
  for (const claim of [...extraClaims].sort((a, b) => (b?.length ?? 0) - (a?.length ?? 0))) {
    if (!claim) continue;
    if (claimPattern(claim).test(sanitized)) {
      matches.push(claim);
      sanitized = sanitized.replace(claimPattern(claim), "sélectionné par UNPRO");
    }
  }

  return { clean: matches.length === 0, matches: [...new Set(matches)], sanitized };
}

/* ── Server calls ───────────────────────────────────────────────── */

const FAIL_CLOSED: ComplianceVerdict = {
  decision: "PENDING_REVIEW",
  allowed: false,
  fail_closed: true,
  reason: "client_error",
  action: "unknown",
  profession_code: null,
};

export async function evaluateCompliance(opts: {
  professionCode: string | null | undefined;
  action: ComplianceAction;
  compensationType?: CompensationType | null;
  alexScope?: string | null;
  sessionId?: string | null;
}): Promise<ComplianceVerdict> {
  if (!opts.professionCode) {
    return { ...FAIL_CLOSED, reason: "missing_profession_code", action: opts.action };
  }
  const { data, error } = await supabase.functions.invoke("compliance-guard", {
    body: {
      op: "evaluate",
      profession_code: opts.professionCode,
      action: opts.action,
      compensation_type: opts.compensationType ?? null,
      alex_scope: opts.alexScope ?? null,
      session_id: opts.sessionId ?? null,
    },
  });
  if (error || !data) return { ...FAIL_CLOSED, action: opts.action };
  return data as ComplianceVerdict;
}

export async function fetchComplianceRules(): Promise<ProfessionComplianceRule[]> {
  const { data, error } = await supabase
    .from("profession_compliance_rules")
    .select("*")
    .order("profession_label_fr", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ProfessionComplianceRule[];
}

export async function fetchComplianceRule(
  professionCode: string,
): Promise<ProfessionComplianceRule | null> {
  const { data, error } = await supabase
    .from("profession_compliance_rules")
    .select("*")
    .eq("profession_code", professionCode)
    .eq("is_active", true)
    .maybeSingle();
  if (error) return null;
  return (data as unknown as ProfessionComplianceRule) ?? null;
}

export interface ProfessionalCredential {
  id: string;
  contractor_id: string;
  profession_code: string | null;
  credential_type: string | null;
  credential_value: string | null;
  issuer: string | null;
  issued_at: string | null;
  expires_at: string | null;
  verification_state: VerificationState;
  credential_status: CredentialStatus;
  effective_status?: CredentialStatus;
  effective_verification_state?: VerificationState;
  source_url: string | null;
  source_last_verified_at: string | null;
  verified_at: string | null;
}

/**
 * Public-safe credential read.
 * Uses the `public_contractor_credentials` RPC (SECURITY DEFINER, strictly
 * filtered): no documents, no internal notes, no private evidence.
 * Anonymous visitors get the same public truth as signed-in users.
 * Errors THROW so the UI can say "temporarily unavailable" instead of
 * concluding that the professional has no credentials.
 */
export async function fetchProfessionalCredentials(
  contractorId: string,
): Promise<ProfessionalCredential[]> {
  const { data, error } = await supabase.rpc("public_contractor_credentials", {
    _contractor_id: contractorId,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    contractor_id: contractorId,
    profession_code: (row.profession_code as string) ?? null,
    credential_type: (row.credential_type as string) ?? null,
    credential_value: (row.public_value as string) ?? null,
    issuer: (row.issuer as string) ?? null,
    issued_at: (row.issued_at as string) ?? null,
    expires_at: (row.expires_at as string) ?? null,
    verification_state: (row.verification_state as VerificationState) ?? "PENDING",
    credential_status: (row.credential_status as CredentialStatus) ?? "UNVERIFIED",
    effective_verification_state: (row.verification_state as VerificationState) ?? "PENDING",
    effective_status: (row.credential_status as CredentialStatus) ?? "UNVERIFIED",
    source_url: null,
    source_last_verified_at: (row.source_last_verified_at as string) ?? null,
    verified_at: (row.verified_at as string) ?? null,
  })) as ProfessionalCredential[];
}

