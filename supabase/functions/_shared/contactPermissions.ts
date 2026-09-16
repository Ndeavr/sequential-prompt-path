/**
 * UNPRO — Permissions de contact au niveau destination (logique pure).
 *
 * Source de vérité : `v_commercial_send_eligibility` (preuve CASL par
 * destination) + marqueurs de conformité et de validation du dossier.
 * La simple présence d'un numéro ou d'un courriel n'autorise JAMAIS un envoi
 * commercial.
 *
 * Portée des canaux :
 *  - SMS / courriel commercial : preuve LCAP valide exigée pour la destination
 *    exacte, échec fermé.
 *  - Appel manuel composé par l'opérateur : ÉCHEC FERMÉ également. L'appel n'est
 *    permis que si le numéro a été validé positivement (statuts positifs
 *    réellement observés en base : `valid_mobile`, `valid_sms_capable_voip`) et
 *    qu'aucun retrait, suppression, révision de conformité ou risque n'est ouvert.
 *
 * `research_only` = AUCUN canal permis (ni appel, ni SMS, ni courriel).
 */


export interface SendEligibilityRow {
  contractor_lead_id: string;
  compliance_review_required: boolean | null;
  compliance_review_reason: string | null;
  valid_phone_evidence_count: number | null;
  valid_email_evidence_count: number | null;
  phone_suppressed: boolean | null;
  email_suppressed: boolean | null;
}

/** Statuts de validation téléphonique qui interdisent explicitement l'appel. */
export const INVALID_PHONE_STATUSES = [
  "invalid",
  "invalid_number",
  "disconnected",
  "unreachable",
  "landline_invalid",
] as const;

/**
 * Statuts de validation téléphonique POSITIFS.
 * Liste volontairement restreinte aux seules valeurs positives réellement
 * observées en production. Aucun statut permissif ajouté « au cas où ».
 */
export const VERIFIED_PHONE_STATUSES = [
  "valid_mobile",
  "valid_sms_capable_voip",
] as const;

export interface ContactPermissionInput {
  /** Ligne d'éligibilité canonique, ou null si le prospect n'est pas relié à un contractor_lead. */
  eligibility: SendEligibilityRow | null;
  has_phone: boolean;
  has_email: boolean;
  do_not_contact?: boolean | null;
  unsubscribed?: boolean | null;
  /** Statut de validation du numéro (verified_contractor_prospects / contractor_leads). */
  phone_validation_status?: string | null;
  /** Révision de conformité ouverte au niveau du dossier lui-même. */
  compliance_review_required?: boolean | null;
  compliance_review_reason?: string | null;
}

export interface ContactPermissions {
  can_call: boolean;
  can_sms: boolean;
  can_email: boolean;
  /** Vrai seulement si AUCUN canal n'est permis (recherche / profil uniquement). */
  research_only: boolean;
  /** Vrai quand le numéro n'a PAS été validé positivement (appel interdit). */
  phone_unverified: boolean;
  reasons: {
    call: string | null;
    sms: string | null;
    email: string | null;
  };
}

const R = {
  no_phone: "Aucun numéro de téléphone au dossier.",
  no_email: "Aucune adresse courriel.",
  opted_out: "Cette entreprise a demandé à ne pas être contactée.",
  unsubscribed: "Cette entreprise s'est désabonnée.",
  not_linked: "Aucun dossier de conformité relié : envoi impossible tant que la preuve LCAP n'est pas rattachée.",
  compliance: "Révision de conformité requise avant tout contact.",
  no_evidence: "Aucune preuve LCAP valide pour cette destination.",
  suppressed: "Destination dans l'index de suppression.",
  invalid_phone: "Numéro déclaré invalide à la validation.",
  phone_not_validated:
    "Numéro non validé positivement : aucun appel tant que la validation n'a pas confirmé le numéro.",
  phone_pending: "Validation du numéro en attente : aucun appel avant confirmation.",
  phone_lookup_failed:
    "La validation du numéro a échoué chez le fournisseur : aucun appel avant une nouvelle validation.",
  phone_outside_quebec: "Numéro hors Québec : appel non autorisé pour ce dossier.",
};

/** Raison exacte, par statut réel de validation, quand aucun appel n'est permis. */
function notValidatedReason(status: string): string {
  if (status === "pending_validation" || status === "pending") return R.phone_pending;
  if (status === "lookup_failed") return R.phone_lookup_failed;
  if (status === "outside_quebec") return R.phone_outside_quebec;
  return R.phone_not_validated;
}

/** Calcule les permissions réelles. Échec fermé par défaut. */
export function computeContactPermissions(input: ContactPermissionInput): ContactPermissions {
  const optedOut = input.do_not_contact === true;
  const unsub = input.unsubscribed === true;
  const e = input.eligibility;
  const phoneStatus = String(input.phone_validation_status ?? "").toLowerCase();
  const phoneInvalid = (INVALID_PHONE_STATUSES as readonly string[]).includes(phoneStatus);
  const phoneVerified = (VERIFIED_PHONE_STATUSES as readonly string[]).includes(phoneStatus);

  const complianceOpen =
    input.compliance_review_required === true || e?.compliance_review_required === true;
  const complianceReason = input.compliance_review_reason ?? e?.compliance_review_reason ?? null;
  const complianceText = complianceReason ? `${R.compliance} (${complianceReason})` : R.compliance;

  // ── Appel manuel composé par un opérateur humain ───────────────────
  // L'appel est BLOQUÉ uniquement quand le numéro est absent, explicitement
  // invalide, supprimé, sous retrait/désabonnement, hors Québec, ou lorsqu'une
  // révision de conformité est ouverte. Un statut simplement inconnu
  // (`unverified`, `pending_validation`, `lookup_failed`, null) n'est PAS un
  // blocage : l'appel manuel n'est pas un envoi commercial électronique.
  // SMS et courriel conservent leur porte LCAP stricte plus bas.
  let call: string | null = null;
  if (!input.has_phone) call = R.no_phone;
  else if (optedOut) call = R.opted_out;
  else if (unsub) call = R.unsubscribed;
  else if (complianceOpen) call = complianceText;
  else if (e?.phone_suppressed === true) call = R.suppressed;
  else if (phoneInvalid) call = R.invalid_phone;
  else if (phoneStatus === "outside_quebec") call = notValidatedReason(phoneStatus);

  // ── Canaux électroniques commerciaux ───────────────────────────────
  const electronic = (kind: "sms" | "email"): string | null => {
    const has = kind === "sms" ? input.has_phone : input.has_email;
    if (!has) return kind === "sms" ? R.no_phone : R.no_email;
    if (optedOut) return R.opted_out;
    if (unsub) return R.unsubscribed;
    if (complianceOpen) return complianceText;
    if (kind === "sms" && phoneInvalid) return R.invalid_phone;
    if (!e) return R.not_linked;
    const suppressed = kind === "sms" ? e.phone_suppressed : e.email_suppressed;
    if (suppressed === true) return R.suppressed;
    const count = Number((kind === "sms" ? e.valid_phone_evidence_count : e.valid_email_evidence_count) ?? 0);
    if (count <= 0) return R.no_evidence;
    return null;
  };

  const smsReason = electronic("sms");
  const emailReason = electronic("email");

  return {
    can_call: call === null,
    can_sms: smsReason === null,
    can_email: emailReason === null,
    research_only: call !== null && smsReason !== null && emailReason !== null,
    phone_unverified: !phoneVerified,
    reasons: { call, sms: smsReason, email: emailReason },
  };
}
